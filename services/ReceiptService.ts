import { supabase } from '../supabaseClient';

interface PrinterSettings {
    type: 'browser' | 'bluetooth' | 'network';
    networkIp?: string;
    paperWidth: '58mm' | '80mm';
}

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

    async printOrder(orderId: string) {
        const settings = this.getSettings();

        console.log('Printing order', orderId, 'using', settings.type);

        if (settings.type === 'browser') {
            await this.printBrowser(orderId);
        } else if (settings.type === 'bluetooth') {
            await this.printBluetooth(orderId);
        } else if (settings.type === 'network') {
            await this.printNetwork(orderId, settings.networkIp);
        }
    }

    private async printBrowser(orderId: string) {
        // Open the public receipt page in a popup window
        const url = `#/r/${orderId}`;
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
            // Wait for it to load then print
            // We can't easily detect when React finishes rendering in the popup from here cross-origin (even if same origin, it's tricky).
            // But since it is same origin (hash router), we might be able to.
            // A better way is to have the page itself auto-print if a query param ?print=true is present.
            // Let's rely on the user clicking print in the popup for now, or add auto-print to the page.

            // Actually, let's try to focus it.
            popup.focus();
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
