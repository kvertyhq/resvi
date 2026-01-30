import { supabase } from '../supabaseClient';

interface PrinterSettings {
    type: 'browser' | 'bluetooth' | 'network';
    networkIp?: string;
    paperWidth: '58mm' | '80mm';
}

type PrintMode = 'auto_with_drawer' | 'auto_no_drawer' | 'manual';

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

            console.log('Receipt settings data:', data);
            console.log('Receipt settings error:', error);

            if (error) {
                console.error('Error fetching print mode:', error);
                return 'manual'; // Default to manual on error
            }

            const printMode = data?.print_mode || 'manual';
            console.log('Resolved print mode:', printMode);
            return printMode;
        } catch (error) {
            console.error('Error in getPrintMode:', error);
            return 'manual';
        }
    }

    /**
     * Open cash drawer using ESC/POS commands
     * This is a dummy implementation - actual drawer commands will be added later
     */
    async openCashDrawer(): Promise<void> {
        console.log('🔓 Opening cash drawer (dummy implementation)');
        console.log('ESC/POS command would be sent here: ESC p m t1 t2');
        console.log('Standard command: 0x1B 0x70 0x00 0x19 0xFA');

        // TODO: Implement actual ESC/POS commands for cash drawer
        // Example for future implementation:
        // const drawerCommand = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
        // await this.sendToPrinter(drawerCommand);

        // For now, just show a visual indicator
        if (typeof window !== 'undefined') {
            // Could show a toast notification here
            console.log('Cash drawer pulse sent');
        }
    }

    /**
     * Print order receipt with auto-print support
     * @param orderId - The order ID to print
     * @param restaurantId - Optional restaurant ID for auto-print mode checking
     * @param forceManual - Force manual print regardless of settings
     */
    async printOrder(orderId: string, restaurantId?: string, forceManual: boolean = false) {
        const settings = this.getSettings();

        console.log('Printing order', orderId, 'using', settings.type);

        // Check if we should auto-print
        let shouldAutoPrint = false;
        let shouldOpenDrawer = false;

        if (!forceManual && restaurantId) {
            const printMode = await this.getPrintMode(restaurantId);
            console.log('Print mode:', printMode);

            if (printMode === 'auto_with_drawer') {
                shouldAutoPrint = true;
                shouldOpenDrawer = true;
            } else if (printMode === 'auto_no_drawer') {
                shouldAutoPrint = true;
                shouldOpenDrawer = false;
            } else if (printMode === 'manual') {
                console.log('Manual print mode - skipping auto-print');
                return; // Don't print automatically in manual mode
            }
        }

        // Open cash drawer if needed (before printing)
        if (shouldOpenDrawer) {
            await this.openCashDrawer();
        }

        // Print based on printer type
        if (settings.type === 'browser') {
            await this.printBrowser(orderId, shouldAutoPrint);
        } else if (settings.type === 'bluetooth') {
            await this.printBluetooth(orderId);
        } else if (settings.type === 'network') {
            await this.printNetwork(orderId, settings.networkIp);
        }
    }

    private async printBrowser(orderId: string, autoPrint: boolean = false) {
        // Open the public receipt page in a popup window
        const url = `#/r/${orderId}${autoPrint ? '?autoprint=true' : ''}`;
        const width = 400;
        const height = 600;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        const popup = window.open(
            url,
            'Receipt',
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
        );

        if (popup) {
            popup.focus();

            // If auto-print is enabled, the receipt page will handle printing automatically
            // via the ?autoprint=true query parameter
        } else {
            alert('Popup blocked. Please allow popups for this site to print receipts.');
        }
    }

    private async printBluetooth(orderId: string) {
        // Placeholder for Web Bluetooth API
        // This usually requires a specific ESC/POS library and user gesture to pair.
        // For this demo/MVP, we will just alert.
        alert('Bluetooth printing selected. Ensure your device is paired. (Feature coming soon)');
        console.log('Bluetooth print logic would go here for order:', orderId);

        // In a real app we'd fetch the order data, format it to ESC/POS commands (hex),
        // requestDevice({ filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }] })
        // and write to the characteristic.
    }

    private async printNetwork(orderId: string, ip?: string) {
        if (!ip) {
            alert('No Printer IP configured.');
            return;
        }
        // Direct network printing from browser is restricted by CORS and network security.
        // It typically requires a local proxy/bridge or a printer that supports WebSockets/HTTP directly with CORS allowed.
        // Or using a browser extension.
        alert(`Network printing to ${ip} requested. This requires a local print proxy service in a browser environment.`);
    }
}

export const receiptService = new ReceiptService();
