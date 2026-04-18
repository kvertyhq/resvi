import { supabase } from '../supabaseClient';
import { invoke } from '@tauri-apps/api/core';
import { Capacitor } from '@capacitor/core';
import { Printer as CapacitorPrinter } from '@bcyesil/capacitor-plugin-printer';

interface PrinterSettings {
    type: 'browser' | 'bluetooth' | 'network';
    networkIp?: string;
    bluetoothMac?: string;
    paperWidth: '58mm' | '80mm';
}

type PrintMode = 'auto_with_drawer' | 'auto_no_drawer' | 'manual';

const ESC_POS_COMMANDS = {
    DRAWER_KICK: [27, 112, 0, 25, 250], // ESC p 0 25 250
    PRINT_NV_LOGO: [28, 112, 1, 0],    // FS p 1 0 (Print first NV logo)
};

class ReceiptService {
    private getSettings(): PrinterSettings {
        const saved = localStorage.getItem('pos_printer_settings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse printer settings', e);
            }
        }
        return { type: 'browser', paperWidth: '80mm' };
    }

    /**
     * Helper to wrap text into multiple lines based on word boundaries.
     */
    private wrapText(text: string, width: number): string[] {
        if (!text) return [];
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let currentLine = '';

        words.forEach(word => {
            if (!word) return;
            // Check if adding this word (and a space) exceeds the width
            if ((currentLine + (currentLine ? ' ' : '') + word).length <= width) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) lines.push(currentLine);
                
                // Handle single words longer than width by splitting them
                let remainingWord = word;
                while (remainingWord.length > width) {
                    lines.push(remainingWord.slice(0, width));
                    remainingWord = remainingWord.slice(width);
                }
                currentLine = remainingWord;
            }
        });
        if (currentLine) lines.push(currentLine);
        return lines;
    }

    /**
     * Fetch print mode from database for a restaurant
     */
    async getPrintMode(restaurantId: string): Promise<PrintMode> {
        try {
            const { data, error } = await supabase.rpc('get_receipt_settings', {
                p_restaurant_id: restaurantId
            });

            if (error) {
                console.error('Error fetching print mode:', error);
                return 'manual'; // Default to manual on error
            }

            return data?.print_mode || 'manual';
        } catch (error) {
            console.error('Error in getPrintMode:', error);
            return 'manual';
        }
    }

    /**
     * Open cash drawer using ESC/POS commands
     */
    async openCashDrawer(settings?: PrinterSettings): Promise<void> {
        const activeSettings = settings || this.getSettings();
        console.log(`🔓 Attempting to open cash drawer [Mode: ${activeSettings.type}]`);

        if (activeSettings.type === 'network' && activeSettings.networkIp) {
            if ((window as any).__TAURI_INTERNALS__) {
                try {
                    console.log(`📡 Sending kick command to ${activeSettings.networkIp}:9100`);
                    await invoke('print_raw_to_network', {
                        ip: activeSettings.networkIp,
                        port: 9100,
                        data: ESC_POS_COMMANDS.DRAWER_KICK
                    });
                    console.log('✅ Cash drawer command sent successfully');
                } catch (e) {
                    console.error('❌ Failed to open drawer via Network/Tauri', e);
                }
            } else {
                console.warn('⚠️ Cash drawer: Network trigger requires Tauri (desktop app).');
            }
        } else if (activeSettings.type === 'browser') {
            console.info('ℹ️ Cash drawer: Browser printing detected. Most browsers cannot trigger drawers directly without a local relay/driver.');
        } else if (activeSettings.type === 'bluetooth') {
            console.info('ℹ️ Cash drawer: Bluetooth trigger not yet implemented.');
        }
    }

    /**
     * Helper to dispatch print job to the correct driver
     */
    private async printToDriver(orderId: string, settings: PrinterSettings, stationId?: string, showAlert?: any, round?: number, isKOT: boolean = false) {
        if (Capacitor.isNativePlatform()) {
            await this.printCapacitor(orderId, stationId, round, isKOT);
        } else if (settings.type === 'browser') {
            await this.printBrowser(orderId, true, stationId, round, isKOT);
        } else if (settings.type === 'bluetooth') {
            await this.printBluetooth(orderId, settings, stationId, showAlert);
        } else if (settings.type === 'network') {
            await this.printNetwork(orderId, settings, stationId, showAlert, isKOT);
        }
    }

    /**
     * Main entry point to print an order.
     * Handles Master Receipt + Station Receipts (Kitchen/Bar) based on configuration.
     * 
     * @param orderId - The Order ID
     * @param restaurantId - Optional, needed for auto-print checks and station fetching
     * @param forceManual - If true, treats as a manual print request (ignores auto-print settings)
     */
    async printOrder(
        orderId: string,
        restaurantId?: string,
        forceManual: boolean = false,
        paymentMethod?: string,
        showAlert?: any
    ) {
        const settings = this.getSettings();
        console.log('Printing order', orderId, 'using', settings.type, 'Payment:', paymentMethod);

        // 1. Determine Print Mode & Drawer
        let shouldAutoPrint = false;
        let shouldOpenDrawer = paymentMethod?.toLowerCase() === 'cash';

        // If manual, we generally just print. 
        // If auto, we check settings.
        if (!forceManual && restaurantId) {
            const printMode = await this.getPrintMode(restaurantId);
            if (printMode === 'auto_with_drawer') {
                shouldAutoPrint = true;
                shouldOpenDrawer = true; // Always open if setting is forced
            } else if (printMode === 'auto_no_drawer') {
                shouldAutoPrint = true;
                // shouldOpenDrawer remains based on paymentMethod
            } else if (printMode === 'manual') {
                console.log('Manual print mode in settings - skipping auto-print flow');
                return;
            }
        } else if (forceManual) {
            // Manual print usually implies opening the drawer? Maybe not.
            // Let's assume manual print just prints receipts.
        }

        // 2. Open Cash Drawer (Only once per order print sequence)
        if (shouldOpenDrawer) {
            await this.openCashDrawer(settings);
        }

        // 3. Print Master Receipt
        // Always print the master receipt (contains everything)
        await this.printToDriver(orderId, settings, undefined, showAlert);

        // 4. Print Station Tickets (Kitchen/Bar)
        // We do this if:
        // - It's an auto-print (new order)
        // - OR it's a manual print (maybe user wants to re-print everything?)
        // Let's assume for now manual print also triggers station prints if they exist, 
        // because "Print" usually means "send to all configured printers".
        if (restaurantId) {
            const { data: stations } = await supabase
                .from('stations')
                .select('id, type')
                .eq('restaurant_id', restaurantId);

            if (stations && stations.length > 0) {
                // Add a small delay between prints to avoid browser blocking
                for (const station of stations) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.printToDriver(orderId, settings, station.id, showAlert);
                }
            }
        }
    }

    /**
     * Prints only kitchen/station tickets (KOT)
     */
    async printKitchenTickets(orderId: string, restaurantId: string, round?: number, showAlert?: any) {
        const settings = this.getSettings();

        // 1. Fetch order items to identify active stations
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('station_id')
            .eq('order_id', orderId);

        if (itemsError) {
            console.error('Error fetching order items for KOT filtering:', itemsError);
            // Fallback: Continue without filtering if query fails
        }

        const activeStationIds = new Set(orderItems?.map(i => i.station_id).filter(Boolean) || []);
        const hasItemsWithoutStation = orderItems?.some(i => !i.station_id) || false;

        // 2. Fetch all configured stations
        const { data: stations } = await supabase
            .from('stations')
            .select('id, type')
            .eq('restaurant_id', restaurantId);

        let printTriggered = false;

        // 3. Print to specific stations that have items
        if (stations && stations.length > 0) {
            for (const station of stations) {
                if (activeStationIds.has(station.id)) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.printToDriver(orderId, settings, station.id, showAlert, round, true);
                    printTriggered = true;
                }
            }
        }

        // 4. Fallback: If items exist without a station, or if no station-specific tickets were printed,
        // print a general "Master" Kitchen Ticket.
        if (hasItemsWithoutStation || !printTriggered) {
            if (activeStationIds.size === 0 || hasItemsWithoutStation) {
                await this.printToDriver(orderId, settings, undefined, showAlert, round, true);
            }
        }
    }

    /**
     * Print X or Z Report
     */
    async printReport(type: 'x' | 'z', restaurantId: string) {
        const url = `#/pos/print-report?type=${type}&restaurant_id=${restaurantId}`;
        const width = 400;
        const height = 800;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        const windowName = `${type.toUpperCase()}_Report_${new Date().toISOString().split('T')[0]}`;

        const popup = window.open(
            url,
            windowName,
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
        );

        if (popup) {
            popup.focus();
        }
    }

    async printLocalOrder(restaurantId: string, orderData: any) {
        // Save temporary data to localStorage for the print page to read
        localStorage.setItem('pos_temp_print_data', JSON.stringify({
            ...orderData,
            restaurant_id: restaurantId,
            printed_at: new Date().toISOString()
        }));

        const url = `#/pos/print-local`;
        const width = 400;
        const height = 800;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        const windowName = `Local_Print_${Date.now()}`;

        const popup = window.open(
            url,
            windowName,
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
        );

        if (popup) {
            popup.focus();
        } else {
            console.warn('Popup blocked for receipt');
        }
    }

    /**
     * Unified method for printing a bill/estimate via the browser's HTML view.
     * Use this for "Bill Estimate", "Pro-forma", or fallback prints.
     */
    async printBill(restaurantId: string, orderData: {
        items: any[],
        subtotal: number,
        tax: number,
        total: number,
        customer?: any,
        tableName?: string,
        orderType?: string,
    }, showAlert?: any) {
        try {
            await this.printLocalOrder(restaurantId, {
                ...orderData,
                type: 'receipt' // Tells the template to show as a bill/receipt
            });
        } catch (error) {
            console.error('Failed to print bill:', error);
            if (showAlert) showAlert('Print Error', 'Failed to generate print view.', 'error');
        }
    }

    private async printBrowser(orderId: string, autoPrint: boolean = false, stationId?: string, round?: number, isKOT: boolean = false) {
        // Open the public receipt page or Kitchen Ticket in a popup window
        let url = isKOT
            ? `#/pos/print-kot/${orderId}?${autoPrint ? 'autoprint=true' : ''}`
            : `#/r/${orderId}?${autoPrint ? 'autoprint=true' : ''}`;

        if (stationId) {
            url += `&station_id=${stationId}`;
        }
        if (round !== undefined) {
            url += `&round=${round}`;
        }

        const width = 400;
        const height = 600;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        // Use a unique name to allow multiple windows
        const windowName = `Receipt_${orderId}_${stationId || 'master'}`;

        const popup = window.open(
            url,
            windowName,
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
        );

        if (popup) {
            popup.focus();
        } else {
            console.warn('Popup blocked for receipt');
        }
    }

    private async printBluetooth(orderId: string, settings: PrinterSettings, stationId?: string, showAlert?: any) {
        const mac = settings.bluetoothMac;
        if (!mac) {
            if (showAlert) showAlert('Printer Error', 'No Bluetooth Printer selected.', 'error');
            return;
        }

        try {
            // 1. Generate Raw Data
            const { data: rawData } = await this.generateRawEscPosData(orderId, settings, stationId);
            if (!rawData || rawData.length === 0) return;

            if ((window as any).__TAURI_INTERNALS__) {
                // 2a. Tauri Bluetooth Print
                await invoke('print_raw_to_bluetooth', {
                    mac: mac,
                    data: Array.from(new Uint8Array(rawData))
                });
            } else if ((navigator as any).bluetooth) {
                // 2b. Web Bluetooth Print
                // Handle Web Bluetooth GATT connection and write
                let device;
                if ((navigator as any).bluetooth.getDevices) {
                    const devices = await (navigator as any).bluetooth.getDevices();
                    device = devices.find((d: any) => d.id === mac);
                }
                
                if (!device) {
                    // Fallback to requestDevice if getDevices didn't find it
                    // Note: web bluetooth requestDevice REQUIRES a user gesture, so this might fail if called in background
                    device = await (navigator as any).bluetooth.requestDevice({
                        acceptAllDevices: true,
                        optionalServices: [
                            '000018f0-0000-1000-8000-00805f9b34fb', // Standard Print
                            '0000ff00-0000-1000-8000-00805f9b34fb', // Generic
                            '0000af00-0000-1000-8000-00805f9b34fb', // Thermal 1
                            '0000ae00-0000-1000-8000-00805f9b34fb', // Thermal 2
                            '49535843-fe7d-4ae5-8fa9-9fafd205e455'  // ISSC
                        ]
                    });
                }

                if (!device) throw new Error('Device not found');

                const server = await device.gatt.connect();
                const services = await server.getPrimaryServices();
                
                let writeChar;
                for (const service of services) {
                    const chars = await service.getCharacteristics();
                    writeChar = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
                    if (writeChar) break;
                }

                if (!writeChar) throw new Error('No writeable characteristic found');

                // Write in chunks (typical BLE MTU is small)
                const chunkSize = 20;
                for (let i = 0; i < rawData.length; i += chunkSize) {
                    const chunk = rawData.slice(i, i + chunkSize);
                    await writeChar.writeValue(new Uint8Array(chunk));
                }
            }
        } catch (error: any) {
            console.error('Bluetooth print failed:', error);
            if (showAlert) showAlert('Printer Error', `Bluetooth printing failed: ${error.message || error}`, 'error');
        }
    }

    private async generateRawEscPosData(orderId: string, settings: PrinterSettings, stationId?: string, isKOT: boolean = false): Promise<{ data: number[], restaurant: any }> {
        // Fetch order and items
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                table_info:table_id(table_name),
                customer:user_id(full_name, phone, address, postcode)
            `)
            .eq('id', orderId === 'TEST' ? 'dummy' : orderId)
            .single();

        if (orderId === 'TEST') {
            const encoder = new TextEncoder();
            return {
                data: [
                    ...[27, 64], ...[27, 97, 1],
                    ...encoder.encode("RESVI TEST PRINT\n"),
                    ...encoder.encode("--------------------------------\n"),
                    ...encoder.encode("Bluetooth Connection Success!\n"),
                    ...encoder.encode("\n\n\n"),
                    ...[29, 86, 66, 0]
                ],
                restaurant: {}
            };
        }

        if (orderError) throw orderError;

        const { data: restaurant } = await supabase.from('restaurant_settings').select('*').eq('id', order.restaurant_id).single();
        const { data: receiptSettings } = await supabase.rpc('get_receipt_settings', { p_restaurant_id: order.restaurant_id });

        let query = supabase.from('order_items').select('*').eq('order_id', orderId);
        if (stationId) query = query.eq('station_id', stationId);
        const { data: items, error: itemsError } = await query;
        if (itemsError) throw itemsError;

        if (!items || items.length === 0) return { data: [], restaurant };

        const encoder = new TextEncoder();
        const lineWidth = settings.paperWidth === '58mm' ? 32 : 42;
        const divider = "-".repeat(lineWidth) + "\n";
        const currency = restaurant.currency || '£';
        const currencyByte = currency === '£' ? 0x9C : (currency === '€' ? 0xD5 : 0x24);

        let data: number[] = [
            ...[27, 64], // Init
            ...[27, 116, 19], // Select PC858
            ...[27, 97, 1], // Center
        ];

        // 1. Restaurant Header
        if (restaurant) {
            const rName = (restaurant.restaurant_name || restaurant.name || 'RESVI').toUpperCase();
            data.push(...[27, 33, 48], ...encoder.encode(`${rName}\n`), ...[27, 33, 0]);
            if (restaurant.address_line1) data.push(...encoder.encode(restaurant.address_line1 + "\n"));
            if (restaurant.phone) data.push(...encoder.encode(restaurant.phone + "\n"));
        }

        // 2. Order Type & Details
        let orderTypeLabel = (order.order_type || 'WALK IN').replace('_', ' ').toUpperCase();
        data.push(
            ...encoder.encode(divider),
            ...[27, 33, 16],
            ...encoder.encode(`${orderTypeLabel.padStart(lineWidth / 2 + orderTypeLabel.length / 2).padEnd(lineWidth).slice(0, lineWidth)}\n`),
            ...[27, 33, 0],
            ...encoder.encode(`Order: ${order.daily_order_number || orderId.slice(0, 8)}\n`),
            ...encoder.encode(`Date: ${new Date(order.created_at).toLocaleString()}\n`)
        );

        // Customer Details
        const cName = order.customer?.full_name || order.customer_name || '';
        const cPhone = order.customer?.phone || order.customer_phone || '';
        const cAddress = order.customer?.address || order.customer_address || '';
        const cPostcode = order.customer?.postcode || order.customer_postcode || '';

        if (cName) data.push(...encoder.encode(`${cName.slice(0, lineWidth)}\n`));
        if (cPhone) data.push(...encoder.encode(`${cPhone.slice(0, lineWidth)}\n`));
        
        if (cAddress || cPostcode) {
            const addr = `${cAddress}${cAddress && cPostcode ? ', ' : ''}${cPostcode}`;
            this.wrapText(addr, lineWidth).forEach(l => data.push(...encoder.encode(l + "\n")));
        }

        data.push(...encoder.encode(divider));

        // 3. Items
        const rootItems = items.filter(i => !i.parent_item_id);
        const allChildren = items.filter(i => i.parent_item_id);

        rootItems.forEach(item => {
            data.push(...this.renderRawItem(item, false, isKOT, lineWidth, encoder, currencyByte));
            allChildren.filter(c => c.parent_item_id === item.id).forEach(c => {
                data.push(...this.renderRawItem(c, true, isKOT, lineWidth, encoder, currencyByte));
            });
        });

        // 4. Totals (Skip for KOT)
        if (!isKOT) {
            data.push(...[27, 97, 1], ...encoder.encode(divider));
            const tax = order.metadata?.tax || 0;
            if (tax > 0) {
                const taxLabel = "Tax: ";
                const taxVal = tax.toFixed(2);
                data.push(...encoder.encode(taxLabel.padStart(lineWidth - taxVal.length - 1)), currencyByte, ...encoder.encode(taxVal + "\n"));
            }

            const totalLabel = "TOTAL: ";
            const totalVal = (order.total_amount || 0).toFixed(2);
            data.push(...[27, 33, 16], ...encoder.encode(totalLabel.padStart(lineWidth - totalVal.length - 1)), currencyByte, ...encoder.encode(totalVal + "\n"), ...[27, 33, 0]);
            
            if (receiptSettings?.footer_text) {
                data.push(...encoder.encode("\n" + receiptSettings.footer_text + "\n"));
            }
        } else {
            data.push(...[27, 97, 1], ...encoder.encode(divider), ...encoder.encode("-- END OF TICKET --\n"));
        }

        data.push(...encoder.encode("\n\n\n"), ...[29, 86, 66, 0]); // Cut

        return { data, restaurant };
    }



    private renderRawItem(item: any, isChild: boolean = false, isKOT: boolean = false, lineWidth: number, encoder: TextEncoder, currencyByte: number) {
        const innerData: number[] = [];
        const itemName = item.name_snapshot || item.name || 'Unknown Item';
        const itemPrice = (item.price_snapshot || item.price || 0) * (item.quantity || 1);

        // Format: Qty(4) + Name(X) + Sym(1) + Price(9) = lineWidth
        const qtyStr = `${item.quantity}x `.padEnd(4);

        if (isKOT) {
            // Double width and double height for Kitchen Items
            const rowLimit = Math.floor(lineWidth / 2); // printer width is halved in double-size mode
            const wrappedNames = this.wrapText(itemName, rowLimit - qtyStr.length);
            
            innerData.push(...[27, 33, 48]); // Double width & height
            wrappedNames.forEach((line, index) => {
                if (index === 0) {
                    innerData.push(...encoder.encode(`${qtyStr.slice(0, 4)}${line}\n`));
                } else {
                    innerData.push(...encoder.encode(`    ${line}\n`)); // 4-char indent (matching qty column)
                }
            });
            innerData.push(...[27, 33, 0]); // Normal size
        } else {
            // Wrapping item name: first line has qty + name + price, continuation lines indent
            const prefixWidth = (isChild ? 4 : 4); // Both use 4 chars for qty
            const nameWidth = lineWidth - prefixWidth - (isChild ? 4 : 0) - 1 - 9; // Indent child name extra
            
            const priceValStr = itemPrice.toFixed(2).padStart(9);
            const wrappedNames = this.wrapText(itemName, nameWidth);

            wrappedNames.forEach((line, index) => {
                if (index === 0) {
                    if (isChild) innerData.push(...encoder.encode("  ")); // extra indent for child
                    innerData.push(...encoder.encode(qtyStr.slice(0, 4)));
                    innerData.push(...encoder.encode(line.padEnd(nameWidth)));
                    innerData.push(...encoder.encode(" "));
                    innerData.push(...encoder.encode(`${priceValStr}\n`));
                } else {
                    // Wrap remaining text with indent
                    const extraIndent = isChild ? 6 : 4;
                    const continuationLines = this.wrapText(line, lineWidth - extraIndent);
                    continuationLines.forEach(cl => {
                        innerData.push(...encoder.encode(" ".repeat(extraIndent) + cl + "\n"));
                    });
                }
            });
        }

        // Modifiers / Addons
        const modifiers = item.selected_modifiers || item.selected_addons || [];
        if (Array.isArray(modifiers) && modifiers.length > 0) {
            const grouped = modifiers.reduce((acc: any, mod: any) => {
                const gName = mod.modifier_group_name || mod.group_name || "Extras";
                if (!acc[gName]) acc[gName] = [];
                acc[gName].push(mod);
                return acc;
            }, {});

            Object.entries(grouped).forEach(([groupName, mods]: [string, any[]]) => {
                const totalGroupPrice = mods.reduce((sum, m) => sum + (m.price || 0), 0);
                const names = mods.map(m => m.name || m.modifier_item_name || m.modifier_name).join(", ");
                const fullText = `+ ${groupName}: ${names}`;
                
                const metaIndent = isChild ? 6 : 4;
                const nameWidth = lineWidth - metaIndent - 1 - 9; // available for modifier text on first line
                const priceStr = totalGroupPrice > 0 ? totalGroupPrice.toFixed(2).padStart(9) : "".padStart(9);
                const wrappedLines = this.wrapText(fullText, nameWidth);

                wrappedLines.forEach((line, index) => {
                    if (index === 0) {
                        innerData.push(...encoder.encode(" ".repeat(metaIndent)));
                        innerData.push(...encoder.encode(line.padEnd(nameWidth)));
                        if (totalGroupPrice > 0 && !isKOT) {
                            innerData.push(...encoder.encode(" "));
                            innerData.push(...encoder.encode(`${priceStr}\n`));
                        } else {
                            innerData.push(...encoder.encode(isKOT ? "\n" : ((" ".repeat(10)) + "\n"))); // 1 space + 9 price
                        }
                    } else {
                        const continuationLines = this.wrapText(line, lineWidth - metaIndent);
                        continuationLines.forEach(cl => {
                            innerData.push(...encoder.encode(" ".repeat(metaIndent) + cl + "\n"));
                        });
                    }
                });
            });
        }

        // Excluded Toppings
        const exclusions = item.excluded_toppings || [];
        if (Array.isArray(exclusions) && exclusions.length > 0) {
            exclusions.forEach((excl: any) => {
                const icon = isChild ? "    - " : "  - ";
                const nameWidth = lineWidth - icon.length;
                let exclStr = `NO ${excl.name}${excl.group_name ? ` (${excl.group_name})` : ""}`;
                if (excl.replacement) {
                    exclStr += ` -> ${excl.replacement.name}${excl.replacement.group_name ? ` (${excl.replacement.group_name})` : ""}`;
                }
                const wrappedExcl = this.wrapText(exclStr, nameWidth);
                wrappedExcl.forEach((line, index) => {
                    if (index === 0) {
                        innerData.push(...encoder.encode(icon + line + "\n"));
                    } else {
                        innerData.push(...encoder.encode(" ".repeat(icon.length) + line + "\n"));
                    }
                });
            });
        }

        // Selected Replacers
        const replacers = item.selected_replacers || [];
        if (Array.isArray(replacers) && replacers.length > 0) {
            replacers.forEach((repl: any) => {
                const replIndent = isChild ? 6 : 4;
                const nameWidth = lineWidth - replIndent - 1 - 9;
                let replContent: string;
                let icon: string;
                
                if (repl.is_exclusion_only) {
                    icon = isChild ? "    x " : "  x ";
                    replContent = `${repl.name}`;
                } else if (repl.ingredient_name) {
                    icon = isChild ? "    x " : "  x ";
                    const ingName = repl.ingredient_name.toLowerCase().startsWith('no') 
                        ? repl.ingredient_name 
                        : `No ${repl.ingredient_name}`;
                    replContent = `${ingName} -> ${repl.name}`;
                } else {
                    icon = isChild ? "    ~ " : "  ~ ";
                    replContent = `${repl.name}`;
                }

                const wrappedRepl = this.wrapText(replContent, nameWidth);
                const replPrice = Number(repl.price_adjustment || 0);
                const replPriceStr = replPrice > 0 ? replPrice.toFixed(2).padStart(9) : "".padStart(9);

                wrappedRepl.forEach((line, index) => {
                    if (index === 0) {
                        innerData.push(...encoder.encode(icon));
                        innerData.push(...encoder.encode(line.padEnd(nameWidth)));
                        if (replPrice > 0 && !isKOT) {
                            innerData.push(...encoder.encode(" "));
                            innerData.push(...encoder.encode(`${replPriceStr}\n`));
                        }
                    } else {
                        innerData.push(...encoder.encode(" ".repeat(icon.length) + line + "\n"));
                    }
                });
            });
        }

        // Deal Selections (Internal Items)
        const selections = item.deal_selections || item.selections || [];
        if (Array.isArray(selections) && selections.length > 0) {
            selections.forEach((sel: any) => {
                const selIcon = isChild ? "      • " : "    • ";
                const nameWidth = lineWidth - selIcon.length - 1 - 9;
                const selName = `${sel.name}${sel.selected_variant ? ` (${sel.selected_variant.name})` : ""}`;
                const wrappedSelName = this.wrapText(selName, nameWidth);
                const selPrice = Number(sel.price_adjustment || 0);
                const selPriceStr = selPrice > 0 ? selPrice.toFixed(2).padStart(9) : "".padStart(9);

                wrappedSelName.forEach((line, index) => {
                    if (index === 0) {
                        innerData.push(...encoder.encode(selIcon));
                        innerData.push(...encoder.encode(line.padEnd(nameWidth)));
                        if (selPrice > 0 && !isKOT) {
                            innerData.push(...encoder.encode(" "));
                            innerData.push(...encoder.encode(`${selPriceStr}\n`));
                        } else {
                            innerData.push(...encoder.encode(isKOT ? "\n" : ((" ".repeat(10)) + "\n")));
                        }
                    } else {
                        innerData.push(...encoder.encode(" ".repeat(selIcon.length) + line + "\n"));
                    }
                });

                // Selection Modifiers
                if (sel.modifiers && sel.modifiers.length > 0) {
                    sel.modifiers.forEach((m: any) => {
                        const mIcon = isChild ? "        + " : "      + ";
                        const mLine = `+ ${m.name}`;
                        const wrappedM = this.wrapText(mLine, lineWidth - mIcon.length);
                        wrappedM.forEach(l => innerData.push(...encoder.encode(mIcon + l + "\n")));
                    });
                }

                // Selection Exclusions
                if (sel.excluded_toppings && sel.excluded_toppings.length > 0) {
                    sel.excluded_toppings.forEach((e: any) => {
                        const eIcon = isChild ? "        - " : "      - ";
                        const eLine = `- NO ${e.name}`;
                        const wrappedE = this.wrapText(eLine, lineWidth - eIcon.length);
                        wrappedE.forEach(l => innerData.push(...encoder.encode(eIcon + l + "\n")));
                    });
                }

                // Selection Replacers
                if (sel.selected_replacers && sel.selected_replacers.length > 0) {
                    sel.selected_replacers.forEach((r: any) => {
                        const rIcon = isChild ? "        x " : "      x ";
                        const rLine = r.is_exclusion_only ? `x ${r.name}` : `~ ${r.name}`;
                        const wrappedR = this.wrapText(rLine, lineWidth - rIcon.length);
                        wrappedR.forEach(l => innerData.push(...encoder.encode(rIcon + l + "\n")));
                    });
                }
            });
        }

        return innerData;
    }

    private async printNetwork(orderId: string, settings: PrinterSettings, stationId?: string, showAlert?: any, isKOT: boolean = false) {
        const ip = settings.networkIp;
        if (!ip) {
            if (showAlert) showAlert('Printer Error', 'No Printer IP configured.', 'error');
            return;
        }

        try {
            const { data: rawData, restaurant } = await this.generateRawEscPosData(orderId, settings, stationId, isKOT);
            if (!rawData || rawData.length === 0) return;

            // Send to Tauri
            if ((window as any).__TAURI_INTERNALS__) {
                await invoke('print_raw_to_network', {
                    ip: ip,
                    port: 9100,
                    data: Array.from(new Uint8Array(rawData))
                });
            } else {
                await this.printBrowser(orderId, true, stationId, undefined, isKOT);
            }
        } catch (error: any) {
            console.error('Network print failed:', error);
            if (showAlert) showAlert('Printer Error', `Failed to print to ${ip}: ${error.message || error}`, 'error');
        }
    }

    /**
     * Print using Capacitor (Android/iOS System Print)
     */
    private async printCapacitor(orderId: string, stationId?: string, round?: number, isKOT: boolean = false) {
        console.log('📱 Printing via Capacitor Native Bridge', { orderId, stationId, isKOT });

        try {
            // 1. Fetch all data needed for the receipt
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select(`
                    *,
                    customer:user_id(full_name, phone, address, postcode),
                    order_items (*)
                `)
                .eq('id', orderId)
                .single();

            if (orderError || !order) throw new Error('Order not found');

            const { data: restData } = await supabase.rpc('get_restaurant_settings', { p_id: order.restaurant_id });
            const settings = Array.isArray(restData?.data) ? restData.data[0] : restData?.data || restData;

            const { data: receiptSettings } = await supabase.rpc('get_receipt_settings', { p_restaurant_id: order.restaurant_id });

            let stationName = '';
            if (stationId) {
                const { data: sData } = await supabase.from('stations').select('name').eq('id', stationId).single();
                if (sData) stationName = sData.name;
            }

            // 2. Filter items
            const displayedItems = order.order_items.filter((item: any) => {
                const stationMatch = !stationId || item.station_id === stationId;
                const roundMatch = round === undefined || item.round_number === round;
                return stationMatch && roundMatch;
            });

            if (displayedItems.length === 0 && stationId) {
                console.log('No items for this station, skipping print');
                return;
            }

            // 3. Generate HTML
            const html = this.generateReceiptHtml(order, settings, receiptSettings, stationName, displayedItems, isKOT);

            // 4. Send to Native Printer
            await CapacitorPrinter.print({
                content: html,
                name: `Order_${order.daily_order_number || order.id.slice(0, 8)}`
            });

        } catch (error) {
            console.error('Capacitor print failed:', error);
        }
    }

    private generateReceiptHtml(order: any, settings: any, receiptSettings: any, stationName: string, items: any[], isKOT: boolean = false) {
        const currency = settings?.currency || '£';
        const logoUrl = receiptSettings?.logo_url || settings?.logo_url;

        return `
            <html>
            <head>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; font-size: 14px; padding: 10px; color: #000; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .uppercase { text-transform: uppercase; }
                    .border-b { border-bottom: 1px dashed #ccc; padding-bottom: 10px; margin-bottom: 10px; }
                    .flex { display: flex; justify-content: space-between; }
                    .small { font-size: 12px; color: #666; }
                    .mt-2 { margin-top: 8px; }
                    .mb-4 { margin-bottom: 16px; }
                    .tag { background: #333; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; display: inline-block; }
                    ${receiptSettings?.custom_css || ''}
                </style>
            </head>
            <body>
                <div class="center border-b">
                    ${receiptSettings?.show_logo && logoUrl ? `<img src="${logoUrl}" style="height:60px; width:60px; border-radius: 50%; margin-bottom: 5px;" />` : ''}
                    <div class="bold" style="font-size: 18px;">${settings?.name || 'Restaurant'}</div>
                    ${stationName ? `<div class="bold mt-2 border-b" style="display:inline-block;">${stationName} TICKET</div>` : ''}
                    <div>${settings?.address_line1 || ''}</div>
                    <div>${settings?.phone || ''}</div>
                    ${receiptSettings?.header_text ? `<div class="mt-2 small">${receiptSettings.header_text}</div>` : ''}
                </div>

                <div class="center border-b">
                    <div class="mb-4">
                        <span class="tag">${order.order_type?.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div class="bold" style="font-size: 16px;">ORDER #${order.daily_order_number || order.id.slice(0, 8)}</div>
                    <div class="small">${new Date(order.created_at).toLocaleString()}</div>
                    
                    ${(order.customer || order.customer_name || order.customer_phone || order.customer_address || order.customer_postcode) ? `
                        <div class="mt-2 small" style="font-style: italic;">
                            <div class="bold">${order.customer?.full_name || order.customer_name || 'Guest'}</div>
                            ${(order.customer?.phone || order.customer_phone) ? `<div>${order.customer?.phone || order.customer_phone}</div>` : ''}
                            ${(order.order_type === 'delivery' && (order.customer?.address || order.customer_address)) ? `
                                <div class="mt-1">
                                    ${order.customer?.address || order.customer_address}
                                    ${(order.customer?.postcode || order.customer_postcode) ? `, ${order.customer?.postcode || order.customer_postcode}` : ''}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>

                <div class="mb-4">
                    ${(() => {
                        const rootItems = items.filter(i => !i.parent_item_id);
                        const allChildren = items.filter(i => i.parent_item_id);

                        const renderItemMeta = (item: any, isChild: boolean = false) => {
                            const mods = item.selected_modifiers || item.selected_addons || [];
                            const modHtml = mods.length > 0 ? (() => {
                                const grouped = mods.reduce((acc: any, mod: any) => {
                                    const gn = mod.modifier_group_name || mod.group_name || 'Extras';
                                    if (!acc[gn]) acc[gn] = [];
                                    acc[gn].push(mod);
                                    return acc;
                                }, {});
                                return Object.entries(grouped).map(([gn, ms]: [string, any[]]) => {
                                    const price = ms.reduce((s, m) => s + (m.price || 0), 0);
                                    return `
                                        <div class="flex small" style="padding-left: ${isChild ? '20px' : '10px'}; font-style: italic; ${isKOT ? "font-size: 16px; font-weight: bold;" : ""}">
                                            <span>+ ${gn}: ${ms.map(m => m.name || m.modifier_item_name || m.modifier_name).join(', ')}</span>
                                            <span>${(stationName || isKOT) || price <= 0 ? '' : price.toFixed(2)}</span>
                                        </div>
                                    `;
                                }).join('');
                            })() : '';

                            const exclHtml = item.excluded_toppings?.map((excl: any) => `
                                <div class="small" style="padding-left: ${isChild ? '20px' : '10px'}; color: red; font-style: italic; ${isKOT ? "font-size: 16px; font-weight: bold;" : ""}">
                                    - NO ${excl.name}
                                </div>
                            `).join('') || '';

                            const replHtml = item.selected_replacers?.map((repl: any) => `
                                <div class="small" style="padding-left: ${isChild ? '20px' : '10px'}; color: #c00; font-style: italic; ${isKOT ? "font-size: 16px; font-weight: bold;" : ""}">
                                    <span>${repl.is_exclusion_only
                                        ? `x ${repl.name}`
                                        : repl.ingredient_name
                                            ? `x ${repl.ingredient_name.toLowerCase().startsWith('no') ? repl.ingredient_name : `No ${repl.ingredient_name}`} &rarr; ${repl.name}`
                                            : `~ ${repl.name}`
                                    }</span>
                                    ${(!(stationName || isKOT) && Number(repl.price_adjustment) > 0) ? `<span style="float:right">${Number(repl.price_adjustment).toFixed(2)}</span>` : ''}
                                </div>
                            `).join('') || '';

                            const selections = item.deal_selections || item.selections || [];
                            const selectionHtml = selections.length > 0 ? selections.map((sel: any) => {
                                const selMods = sel.modifiers?.map((m: any) => `
                                    <div class="small" style="padding-left: ${isChild ? '30px' : '20px'}; font-style: italic; opacity: 0.8;">
                                        + ${m.name}
                                    </div>
                                `).join('') || '';
                                const selExcls = sel.excluded_toppings?.map((e: any) => `
                                    <div class="small" style="padding-left: ${isChild ? '30px' : '20px'}; color: red; font-style: italic; opacity: 0.8;">
                                        - NO ${e.name}
                                    </div>
                                `).join('') || '';
                                const selRepls = sel.selected_replacers?.map((r: any) => `
                                    <div class="small" style="padding-left: ${isChild ? '30px' : '20px'}; color: #c00; font-style: italic; opacity: 0.8;">
                                        ${r.is_exclusion_only ? `x ${r.name}` : `~ ${r.name}`}
                                    </div>
                                `).join('') || '';

                                return `
                                    <div class="flex small" style="padding-left: ${isChild ? '20px' : '10px'}; font-weight: 500; margin-top: 2px;">
                                        <span>&bull; ${sel.name} ${sel.selected_variant ? `(${sel.selected_variant.name})` : ''}</span>
                                        <span>${(!(stationName || isKOT) && Number(sel.price_adjustment) > 0) ? Number(sel.price_adjustment).toFixed(2) : ''}</span>
                                    </div>
                                    ${selMods}${selExcls}${selRepls}
                                `;
                            }).join('') : '';

                            return modHtml + exclHtml + replHtml + selectionHtml;
                        };

                        return rootItems.map(item => {
                            const children = allChildren.filter(c => c.parent_item_id === item.id);
                            
                            let html = `
                                <div class="flex bold ${isKOT ? "mt-2" : ""}" style="${isKOT ? "font-size: 20px;" : ""}">
                                    <span>${item.quantity}x ${item.name_snapshot}</span>
                                    <span>${(stationName || isKOT) ? '' : (item.price_snapshot * item.quantity).toFixed(2)}</span>
                                </div>
                                ${renderItemMeta(item)}
                            `;

                            if (children.length > 0) {
                                html += children.map(c => `
                                    <div class="flex" style="padding-left: 10px; font-size: 13px; color: #444; ${isKOT ? "font-size: 18px; font-weight: bold;" : ""}">
                                        <span>${c.quantity}x ${c.name_snapshot}</span>
                                        <span>${(stationName || isKOT) || c.price_snapshot <= 0 ? '' : (c.price_snapshot * c.quantity).toFixed(2)}</span>
                                    </div>
                                    ${renderItemMeta(c, true)}
                                `).join('');
                            }

                            return html;
                        }).join('');
                    })()}
                    ${(() => {
                        // Handle cases where child items might exist but their parent is not in the list 
                        // (e.g., station receipt where parent is not assigned to this station)
                        const rootIds = new Set(items.filter(i => !i.parent_item_id).map(i => i.id));
                        const orphanedChildren = items.filter(i => i.parent_item_id && !rootIds.has(i.parent_item_id));

                        const renderItemMeta = (item: any, isChild: boolean = false) => {
                            const mods = item.selected_modifiers || item.selected_addons || [];
                            const modHtml = mods.length > 0 ? (() => {
                                const grouped = mods.reduce((acc: any, mod: any) => {
                                    const gn = mod.modifier_group_name || mod.group_name || 'Extras';
                                    if (!acc[gn]) acc[gn] = [];
                                    acc[gn].push(mod);
                                    return acc;
                                }, {});
                                return Object.entries(grouped).map(([gn, ms]: [string, any[]]) => {
                                    const price = ms.reduce((s, m) => s + (m.price || 0), 0);
                                    return `
                                        <div class="flex small" style="padding-left: 10px; font-style: italic; ${isKOT ? "font-size: 16px; font-weight: bold;" : ""}">
                                            <span>+ ${gn}: ${ms.map(m => m.name || m.modifier_item_name || m.modifier_name).join(', ')}</span>
                                            <span>${(stationName || isKOT) || price <= 0 ? '' : price.toFixed(2)}</span>
                                        </div>
                                    `;
                                }).join('');
                            })() : '';

                            const exclHtml = item.excluded_toppings?.map((excl: any) => `
                                <div class="small" style="padding-left: 10px; color: red; font-style: italic; ${isKOT ? "font-size: 16px; font-weight: bold;" : ""}">
                                    - NO ${excl.name}
                                </div>
                            `).join('') || '';

                            const replHtml = item.selected_replacers?.map((repl: any) => `
                                <div class="small" style="padding-left: 10px; color: #c00; font-style: italic; ${isKOT ? "font-size: 16px; font-weight: bold;" : ""}">
                                    <span>${repl.is_exclusion_only
                                        ? `x ${repl.name}`
                                        : repl.ingredient_name
                                            ? `x ${repl.ingredient_name.toLowerCase().startsWith('no') ? repl.ingredient_name : `No ${repl.ingredient_name}`} &rarr; ${repl.name}`
                                            : `~ ${repl.name}`
                                    }</span>
                                    ${(!(stationName || isKOT) && Number(repl.price_adjustment) > 0) ? `<span style="float:right">${Number(repl.price_adjustment).toFixed(2)}</span>` : ''}
                                </div>
                            `).join('') || '';

                            return modHtml + exclHtml + replHtml;
                        };

                        return orphanedChildren.map(c => `
                            <div class="flex bold mt-2" style="${isKOT ? "font-size: 20px;" : ""}">
                                <span>${c.quantity}x ${c.name_snapshot}</span>
                                <span>${(stationName || isKOT) ? '' : (c.price_snapshot * c.quantity).toFixed(2)}</span>
                            </div>
                            <div class="small italic" style="padding-left: 10px; color: #666;">(PART OF DEAL)</div>
                            ${renderItemMeta(c)}
                        `).join('');
                    })()}
                </div>

                ${!isKOT ? `
                    <div class="border-b" style="border-top: 1px dashed #ccc; padding-top: 5px;">
                        <div class="flex bold" style="font-size: 16px;">
                            <span>TOTAL</span>
                            <span>${currency}${order.total_amount.toFixed(2)}</span>
                        </div>
                    </div>
                ` : `
                    <div class="center bold border-t" style="border-top: 1px dashed #ccc; padding-top: 10px;">
                        -- END OF TICKET --
                    </div>
                `}

                ${!isKOT && receiptSettings?.footer_text ? `<div class="center small mt-2">${receiptSettings.footer_text}</div>` : ''}
                ${!isKOT ? `<div class="center small mt-2">Digital Receipt • ${settings?.website_url || ''}</div>` : ''}
            </body>
            </html>
        `;
    }
}

export const receiptService = new ReceiptService();
