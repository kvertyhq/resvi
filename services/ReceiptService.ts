import { supabase } from '../supabaseClient';
import { invoke } from '@tauri-apps/api/core';

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
    async openCashDrawer(): Promise<void> {
        console.log('🔓 Opening cash drawer with ESC/POS command:', ESC_POS_COMMANDS.DRAWER_KICK);

        // Note: For actual ESC/POS implementation in network/bluetooth drivers,
        // we would send these bytes to the printer.
        // For browser printing, this usually stays as a log/event unless a local relay is used.
        if (typeof window !== 'undefined') {
            console.log('Cash drawer pulse signal sent to printer driver');
        }
    }

    /**
     * Helper to dispatch print job to the correct driver
     */
    private async printToDriver(orderId: string, settings: PrinterSettings, stationId?: string, showAlert?: any, round?: number) {
        if (settings.type === 'browser') {
            await this.printBrowser(orderId, true, stationId, round);
        } else if (settings.type === 'bluetooth') {
            await this.printBluetooth(orderId, stationId, showAlert);
        } else if (settings.type === 'network') {
            await this.printNetwork(orderId, settings, stationId, showAlert);
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
            await this.openCashDrawer();
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
        const { data: stations } = await supabase
            .from('stations')
            .select('id, type')
            .eq('restaurant_id', restaurantId);

        if (stations && stations.length > 0) {
            for (const station of stations) {
                // We could filter station type here if we only want to print to certain stations
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.printToDriver(orderId, settings, station.id, showAlert, round);
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

    private async printBrowser(orderId: string, autoPrint: boolean = false, stationId?: string, round?: number) {
        // Open the public receipt page in a popup window
        let url = `#/r/${orderId}?${autoPrint ? 'autoprint=true' : ''}`;
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

    private async printNetwork(orderId: string, settings: PrinterSettings, stationId?: string, showAlert?: any) {
        const ip = settings.networkIp;
        if (!ip) {
            if (showAlert) showAlert('Printer Error', 'No Printer IP configured.', 'error');
            else console.error('No Printer IP configured.');
            return;
        }

        console.log(`Network print to ${ip} for order ${orderId} (Station: ${stationId})`);

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
                        await invoke('print_logo_to_network', {
                            ip: ip,
                            port: 9100,
                            url: logoUrl
                        });
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
                ...[27, 97, 1], // Center the order meta
                ...[27, 33, 16], // Double height for label
                ...encoder.encode(`${orderTypeLabel}\n`),
                ...[27, 33, 0], // Normal size
                ...encoder.encode(`Order: ${order.daily_order_number || orderId.slice(0, 8)}\n`),
                ...encoder.encode(`Date: ${new Date(order.created_at).toLocaleString()}\n`),
            ];

            // Customer Details (for Delivery/Collection or if available)
            const cName = order.customer?.full_name || order.customer_name || '';
            const cPhone = order.customer?.phone || order.customer_phone || '';
            const cAddress = order.customer?.address || order.customer_address || '';
            const cPostcode = order.customer?.postcode || order.customer_postcode || '';

            if (cName || cPhone) {
                data.push(...encoder.encode(`${cName}${cName && cPhone ? ' - ' : ''}${cPhone}\n`));
            }
            if (orderTypeLabel === 'DELIVERY' && (cAddress || cPostcode)) {
                data.push(...encoder.encode(`${cAddress}${cAddress && cPostcode ? ', ' : ''}${cPostcode}\n`));
            }

            data = [
                ...data,
                ...encoder.encode(divider),
                ...[27, 97, 0], // Left for items
            ];

            // 3. Items
            items.forEach((item: any) => {
                const itemName = item.name_snapshot || item.name || 'Unknown Item';
                const itemPrice = (item.price_snapshot || item.price || 0) * (item.quantity || 1);

                // Format: Qty(4) + Name(X) + Sym(1) + Price(9) = lineWidth
                const qtyStr = `${item.quantity}x `.padEnd(4);
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

                // Modifiers / Addons
                const modifiers = item.selected_modifiers || item.selected_addons || [];
                if (Array.isArray(modifiers) && modifiers.length > 0) {
                    modifiers.forEach((mod: any) => {
                        const modName = mod.name || mod.modifier_item_name || mod.modifier_name;
                        const modPrice = mod.price || 0;
                        if (modName) {
                            // Indent(4) + Name(X) + Sym(1) + Price(9)
                            const modQtyStr = "    ";
                            const nameWidth = lineWidth - 4 - 1 - 9;
                            const modNameStr = `+ ${modName}`.slice(0, nameWidth).padEnd(nameWidth);
                            const modPriceValStr = modPrice > 0 ? modPrice.toFixed(2).padStart(9) : "".padStart(9);

                            data.push(...encoder.encode(modQtyStr));
                            data.push(...encoder.encode(modNameStr));
                            if (modPrice > 0) {
                                data.push(...encoder.encode(" ")); // Spacer
                                data.push(...encoder.encode(`${modPriceValStr}\n`));
                            } else {
                                data.push(...encoder.encode(" ".repeat(10) + "\n"));
                            }
                        }
                    });
                }
            });

            // 4. Totals Breakdown
            const subtotal = order.metadata?.subtotal || 0;
            const tax = order.metadata?.tax || 0;
            const deliveryFee = order.metadata?.delivery_fee || 0;

            data = [
                ...data,
                ...[27, 97, 1], // Center for divider
                ...encoder.encode(divider),
                ...[27, 97, 2], // Right for totals
            ];

            if (tax > 0 && restaurant.show_tax !== false) {
                data.push(...encoder.encode("Tax: "));
                data.push(currencyByte);
                data.push(...encoder.encode(`${tax.toFixed(2)}\n`));
            }

            if (deliveryFee > 0) {
                data.push(...encoder.encode("Delivery Fee: "));
                data.push(currencyByte);
                data.push(...encoder.encode(`${deliveryFee.toFixed(2)}\n`));
            }

            // Big Total
            data = [
                ...data,
                ...[27, 33, 16], // Double height
                ...encoder.encode("TOTAL: "),
                currencyByte,
                ...encoder.encode(`${(order.total_amount || 0).toFixed(2)}\n`),
                ...[27, 33, 0], // Normal size
            ];

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

            // 6. Finishing
            data = [
                ...data,
                ...encoder.encode("\n\n\n"),
                ...[29, 86, 66, 0] // Cut
            ];

            // Send to Tauri
            await invoke('print_raw_to_network', {
                ip: ip,
                port: 9100,
                data: Array.from(new Uint8Array(data))
            });

            if (showAlert) showAlert('Success', `Printed to ${ip}`, 'success');
        } catch (error: any) {
            console.error('Network print failed:', error);
            if (showAlert) showAlert('Printer Error', `Failed to print to ${ip}: ${error.message || error}`, 'error');
        }
    }
}

export const receiptService = new ReceiptService();
