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
            await this.printNetwork(orderId, settings.networkIp, stationId, showAlert);
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

    private async printNetwork(orderId: string, ip?: string, stationId?: string, showAlert?: any) {
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
                    table_info:table_id(table_name)
                `)
                .eq('id', orderId)
                .single();

            if (orderError) throw orderError;

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

            // Generate simple ESC/POS buffer
            const encoder = new TextEncoder();
            let data: number[] = [
                ...[27, 64], // Init
                ...[27, 97, 1], // Center
                ...encoder.encode("RESVI RESTAURANT\n"),
                ...encoder.encode("--------------------------------\n"),
                ...[27, 97, 0], // Left
                ...encoder.encode(`Table: ${order.table_info?.table_name || 'Quick Order'}\n`),
                ...encoder.encode(`Order: ${orderId.slice(0, 8)}\n`),
                ...encoder.encode(`Date: ${new Date().toLocaleString()}\n`),
                ...encoder.encode("--------------------------------\n"),
            ];

            items.forEach((item: any) => {
                const line = `${item.quantity}x ${item.name.padEnd(20)} ${item.price.toFixed(2)}\n`;
                data = [...data, ...encoder.encode(line)];
            });

            data = [
                ...data,
                ...encoder.encode("--------------------------------\n"),
                ...[27, 97, 2], // Right
                ...encoder.encode(`TOTAL: $${order.total_amount.toFixed(2)}\n`),
                ...[27, 97, 1], // Center
                ...encoder.encode("\nThank you!\n"),
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
