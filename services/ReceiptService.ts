import { supabase } from '../supabaseClient';
import { invoke } from '@tauri-apps/api/core';
import { Capacitor } from '@capacitor/core';
import { Printer as CapacitorPrinter } from '@bcyesil/capacitor-plugin-printer';

interface PrinterSettings {
    type: 'browser' | 'bluetooth' | 'network';
    networkIp?: string;
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
            await this.printBluetooth(orderId, stationId, showAlert);
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

    private async printBluetooth(orderId: string, stationId?: string, showAlert?: any) {
        // Placeholder for Bluetooth logic
        console.log(`Bluetooth print for order ${orderId} (Station: ${stationId})`);
        const msg = `Bluetooth printing${stationId ? ` for station ${stationId}` : ''} not fully implemented yet.`;
        if (showAlert) showAlert('Bluetooth Printing', msg, 'info');
        else console.log(msg);
    }

    private async printNetwork(orderId: string, settings: PrinterSettings, stationId?: string, showAlert?: any, isKOT: boolean = false) {
        const ip = settings.networkIp;
        if (!ip) {
            if (showAlert) showAlert('Printer Error', 'No Printer IP configured.', 'error');
            else console.error('No Printer IP configured.');
            return;
        }

        console.log(`Network print to ${ip} for order ${orderId} (Station: ${stationId}) (KOT: ${isKOT})`);

        try {
            // Fetch order and items for printing
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select(`
                    *,
                    table_info:table_id(table_name),
                    customer:user_id(full_name, phone, address, postcode)
                `)
                .eq('id', orderId)
                .single();

            if (orderError) throw orderError;

            // Fetch restaurant and receipt settings
            const { data: restaurant } = await supabase
                .from('restaurant_settings')
                .select('*')
                .eq('id', order.restaurant_id)
                .single();

            const { data: receiptSettings } = await supabase.rpc('get_receipt_settings', {
                p_restaurant_id: order.restaurant_id
            });

            let query = supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            if (stationId) {
                query = query.eq('station_id', stationId);
            }

            const { data: items, error: itemsError } = await query;
            if (itemsError) throw itemsError;

            if (!items || items.length === 0) {
                console.log('No items for this station, skipping print.');
                return;
            }

            // 0. Logo (Dynamic from URL)
            if (receiptSettings?.show_logo) {
                const logoUrl = receiptSettings.logo_url || restaurant?.logo_url || restaurant?.logo;
                if (logoUrl) {
                    try {
                        console.log('Printing dynamic logo from URL:', logoUrl);
                        if ((window as any).__TAURI_INTERNALS__) {
                            await invoke('print_logo_to_network', {
                                ip: ip,
                                port: 9100,
                                url: logoUrl
                            });
                        } else {
                            console.warn('Network logo print skipped: Not in Tauri environment');
                        }
                        // Add a small delay for the printer to process the image
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (logoErr) {
                        console.error('Failed to print dynamic logo:', logoErr);
                    }
                }
            }
            // Init data for text
            const encoder = new TextEncoder();
            const currency = restaurant.currency || '£';
            const currencyByte = currency === '£' ? 0x9C : (currency === '€' ? 0xD5 : 0x24); // 0x9C=£ in PC858, 0xD5=€ in PC858, 0x24=$

            const lineWidth = settings.paperWidth === '58mm' ? 32 : 42; // Safer 42 for 80mm
            const divider = "-".repeat(lineWidth) + "\n";

            let data: number[] = [
                ...[27, 64], // Init
                ...[27, 116, 19], // Select PC858 (Euro / UK pound support)
                ...[27, 97, 1], // Center
            ];

            // 1. Restaurant Header
            if (restaurant) {
                const rName = (restaurant.restaurant_name || restaurant.name || 'RESVI').toUpperCase();
                const addr1 = restaurant.address_line1 || restaurant.address || '';
                const addr2 = restaurant.address_line2 || '';

                data = [
                    ...data,
                    ...[27, 33, 48], // Double width & height
                    ...encoder.encode(`${rName}\n`),
                    ...[27, 33, 0], // Normal size
                    ...encoder.encode(`${addr1}${addr1 ? '\n' : ''}`),
                    ...encoder.encode(`${addr2}${addr2 ? '\n' : ''}`),
                    ...encoder.encode(`${restaurant.phone || ''}\n`),
                ];
            }

            // 2. Custom Admin Header
            if (receiptSettings?.header_text) {
                data = [
                    ...data,
                    ...encoder.encode(divider),
                    ...encoder.encode(`${receiptSettings.header_text}\n`),
                ];
            }

            // Order Type Label
            let orderTypeLabel = 'WALK IN';
            if (order.order_type === 'dine_in') orderTypeLabel = 'DINE IN';
            else if (order.order_type === 'delivery') orderTypeLabel = 'DELIVERY';
            else if (order.order_type === 'collection') orderTypeLabel = 'COLLECTION';
            else if (order.order_source === 'online') orderTypeLabel = order.order_type?.toUpperCase() || 'ONLINE';

            data = [
                ...data,
                ...encoder.encode(divider),
                ...[27, 97, 1], // Center
                ...[27, 33, 16], // Double height for label
                ...encoder.encode(`${orderTypeLabel.padStart(lineWidth / 2 + orderTypeLabel.length / 2).padEnd(lineWidth).slice(0, lineWidth)}\n`),
                ...[27, 33, 0], // Normal size
                ...encoder.encode(`Order: ${order.daily_order_number || orderId.slice(0, 8)}\n`),
                ...encoder.encode(`Date: ${new Date(order.created_at).toLocaleString()}\n`),
            ];

            // Customer Details
            const cName = order.customer?.full_name || order.customer_name || '';
            const cPhone = order.customer?.phone || order.customer_phone || '';
            const cAddress = order.customer?.address || order.customer_address || '';
            const cPostcode = order.customer?.postcode || order.customer_postcode || '';

            if (cName || cPhone) {
                const customerLine = `${cName}${cName && cPhone ? ' - ' : ''}${cPhone}`.slice(0, lineWidth);
                data.push(...encoder.encode(`${customerLine}\n`));
            }
            if (orderTypeLabel === 'DELIVERY' && (cAddress || cPostcode)) {
                const addrLine = `${cAddress}${cAddress && cPostcode ? ', ' : ''}${cPostcode}`.slice(0, lineWidth);
                data.push(...encoder.encode(`${addrLine}\n`));
            }

            data = [
                ...data,
                ...encoder.encode(divider),
                // REMOVED [27, 97, 0] - Keep Center for aligned block
            ];

            // 3. Items
            items.forEach((item: any) => {
                const itemName = item.name_snapshot || item.name || 'Unknown Item';
                const itemPrice = (item.price_snapshot || item.price || 0) * (item.quantity || 1);

                // Format: Qty(4) + Name(X) + Sym(1) + Price(9) = lineWidth
                const qtyStr = `${item.quantity}x `.padEnd(4);

                if (isKOT) {
                    // Double width and double height for Kitchen Items
                    const rowLimit = Math.floor(lineWidth / 2);
                    const linesStr = [];
                    let remaining = itemName;

                    const firstChunk = remaining.slice(0, rowLimit - qtyStr.length);
                    linesStr.push(qtyStr + firstChunk);
                    remaining = remaining.slice(rowLimit - qtyStr.length);

                    while (remaining.length > 0) {
                        const chunk = remaining.slice(0, rowLimit - 4); // 4 spaces indent
                        linesStr.push("    " + chunk);
                        remaining = remaining.slice(rowLimit - 4);
                    }

                    data.push(...[27, 33, 48]); // Double width & height
                    linesStr.forEach((l: string) => {
                        data.push(...encoder.encode(`${l}\n`));
                    });
                    data.push(...[27, 33, 0]); // Normal size
                } else {
                    const nameWidth = lineWidth - 4 - 1 - 9;
                    const nameStr = itemName.slice(0, nameWidth).padEnd(nameWidth);
                    const priceValStr = itemPrice.toFixed(2).padStart(9);

                    data = [
                        ...data,
                        ...encoder.encode(qtyStr),
                        ...encoder.encode(nameStr),
                        ...encoder.encode(" "), // Spacer in place of currency byte
                        ...encoder.encode(`${priceValStr}\n`)
                    ];
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
                        const fullLine = `+ ${groupName}: ${names}`;
                        
                        const nameWidth = lineWidth - 4 - 1 - 9;
                        const lineStr = fullLine.slice(0, nameWidth).padEnd(nameWidth);
                        const priceStr = totalGroupPrice > 0 ? totalGroupPrice.toFixed(2).padStart(9) : "".padStart(9);

                        data.push(...encoder.encode("    "));
                        data.push(...encoder.encode(lineStr));
                        if (totalGroupPrice > 0 && !isKOT) {
                            data.push(...encoder.encode(" "));
                            data.push(...encoder.encode(`${priceStr}\n`));
                        } else {
                            data.push(...encoder.encode(isKOT ? "\n" : (" ".repeat(10) + "\n")));
                        }
                    });
                }

                // Excluded Toppings (New)
                const exclusions = item.excluded_toppings || [];
                if (Array.isArray(exclusions) && exclusions.length > 0) {
                    exclusions.forEach((excl: any) => {
                        const nameWidth = lineWidth - 4;
                        let exclStr = `  - NO ${excl.name}${excl.group_name ? ` (${excl.group_name})` : ""}`;
                        if (excl.replacement) {
                            exclStr += ` -> ${excl.replacement.name}${excl.replacement.group_name ? ` (${excl.replacement.group_name})` : ""}`;
                        }
                        data.push(...encoder.encode(exclStr.slice(0, nameWidth).padEnd(nameWidth) + "\n"));
                    });
                }

                // Selected Replacers
                const replacers = item.selected_replacers || [];
                if (Array.isArray(replacers) && replacers.length > 0) {
                    replacers.forEach((repl: any) => {
                        const nameWidth = lineWidth - 4 - 1 - 9;
                        let replStr: string;
                        if (repl.is_exclusion_only) {
                            replStr = `  x ${repl.name}`;
                        } else if (repl.ingredient_name) {
                            const ingName = repl.ingredient_name.toLowerCase().startsWith('no') 
                                ? repl.ingredient_name 
                                : `No ${repl.ingredient_name}`;
                            replStr = `  x ${ingName} -> ${repl.name}`;
                        } else {
                            replStr = `  ~ ${repl.name}`;
                        }
                        const replNameStr = replStr.slice(0, nameWidth).padEnd(nameWidth);
                        const replPrice = Number(repl.price_adjustment || 0);
                        const replPriceStr = replPrice > 0 ? replPrice.toFixed(2).padStart(9) : "".padStart(9);

                        data.push(...encoder.encode("    "));
                        data.push(...encoder.encode(replNameStr));
                        if (replPrice > 0 && !isKOT) {
                            data.push(...encoder.encode(" "));
                            data.push(...encoder.encode(`${replPriceStr}\n`));
                        } else {
                            data.push(...encoder.encode(isKOT ? "\n" : (" ".repeat(10) + "\n")));
                        }
                    });
                }
            });

            // 4. Totals Breakdown (Skip for KOT)
            if (!isKOT) {
                const subtotal = order.metadata?.subtotal || 0;
                const tax = order.metadata?.tax || 0;
                const deliveryFee = order.metadata?.delivery_fee || 0;

                data = [
                    ...data,
                    ...[27, 97, 1], // Center for divider
                    ...encoder.encode(divider),
                ];

                if (tax > 0 && restaurant.show_tax !== false) {
                    const taxLabel = "Tax: ";
                    const taxVal = tax.toFixed(2);
                    const paddingCount = lineWidth - taxLabel.length - taxVal.length - 1;
                    data.push(...encoder.encode(" ".repeat(Math.max(0, paddingCount))));
                    data.push(...encoder.encode(taxLabel));
                    data.push(currencyByte);
                    data.push(...encoder.encode(`${taxVal}\n`));
                }

                if (deliveryFee > 0) {
                    const deliveryLabel = "Delivery Fee: ";
                    const deliveryVal = deliveryFee.toFixed(2);
                    const paddingCount = lineWidth - deliveryLabel.length - deliveryVal.length - 1;
                    data.push(...encoder.encode(" ".repeat(Math.max(0, paddingCount))));
                    data.push(...encoder.encode(deliveryLabel));
                    data.push(currencyByte);
                    data.push(...encoder.encode(`${deliveryVal}\n`));
                }

                // Big Total - Manual right align within block
                const totalLabel = "TOTAL: ";
                const totalVal = (order.total_amount || 0).toFixed(2);
                const paddingCount = lineWidth - totalLabel.length - totalVal.length - 1;

                data.push(...[27, 33, 16]); // Double height
                data.push(...encoder.encode(" ".repeat(Math.max(0, paddingCount))));
                data.push(...encoder.encode(totalLabel));
                data.push(currencyByte);
                data.push(...encoder.encode(`${totalVal}\n`));
                data.push(...[27, 33, 0]); // Reset

                // 5. Custom Admin Footer (includes Thank You if configured)
                if (receiptSettings?.footer_text) {
                    data = [
                        ...data,
                        ...[27, 97, 1], // Center
                        ...encoder.encode("\n"),
                        ...encoder.encode(`${receiptSettings.footer_text}\n`),
                    ];
                } else {
                    // Default footer if no custom one
                    data = [
                        ...data,
                        ...[27, 97, 1], // Center
                        ...encoder.encode("\nThank you for choosing us!\n"),
                    ];
                }
            } else {
                // KOT Footer
                data = [
                    ...data,
                    ...[27, 97, 1], // Center
                    ...encoder.encode(divider),
                    ...encoder.encode("-- END OF TICKET --\n"),
                ];
            }

            // 6. Finishing
            data = [
                ...data,
                ...encoder.encode("\n\n\n"),
                ...[29, 86, 66, 0] // Cut
            ];

            // Send to Tauri
            if ((window as any).__TAURI_INTERNALS__) {
                await invoke('print_raw_to_network', {
                    ip: ip,
                    port: 9100,
                    data: Array.from(new Uint8Array(data))
                });
                // if (showAlert) showAlert('Success', `Printed to ${ip}`, 'success');
            } else {
                console.error('Network print failed: invoke is not available');
                if (showAlert) showAlert('Printer Error', 'Network printing requires the desktop application.', 'error');
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
                    
                    ${(order.customer || order.customer_name) ? `
                        <div class="mt-2 small" style="font-style: italic;">
                            <div class="bold">${order.customer?.full_name || order.customer_name || 'Guest'}</div>
                            ${order.customer?.phone || order.customer_phone || ''}
                        </div>
                    ` : ''}
                </div>

                <div class="mb-4">
                    ${items.map(item => `
                        <div class="flex bold ${isKOT ? "mt-2" : ""}" style="${isKOT ? "font-size: 20px;" : ""}">
                            <span>${item.quantity}x ${item.name_snapshot}</span>
                            <span>${(stationName || isKOT) ? '' : (item.price_snapshot * item.quantity).toFixed(2)}</span>
                        </div>
                        ${(() => {
                            const mods = item.selected_modifiers || item.selected_addons || [];
                            if (mods.length === 0) return '';
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
                        })()}
                        ${item.excluded_toppings?.map((excl: any) => `
                            <div class="small" style="padding-left: 10px; color: red; font-style: italic; ${isKOT ? "font-size: 16px; font-weight: bold;" : ""}">
                                - NO ${excl.name}
                            </div>
                        `).join('') || ''}
                        ${item.selected_replacers?.map((repl: any) => `
                            <div class="small" style="padding-left: 10px; color: #c00; font-style: italic; ${isKOT ? "font-size: 16px; font-weight: bold;" : ""}">
                                <span>${repl.is_exclusion_only
                                    ? `x ${repl.name}`
                                    : repl.ingredient_name
                                        ? `x ${repl.ingredient_name.toLowerCase().startsWith('no') ? repl.ingredient_name : `No ${repl.ingredient_name}`} &rarr; ${repl.name}`
                                        : `~ ${repl.name}`
                                }</span>
                                ${(!(stationName || isKOT) && Number(repl.price_adjustment) > 0) ? `<span style="float:right">${Number(repl.price_adjustment).toFixed(2)}</span>` : ''}
                            </div>
                        `).join('') || ''}
                    `).join('')}
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
