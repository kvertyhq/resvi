// Sunmi Printer Utility for Web
// Note: This relies on the specific Sunmi JS interface being available in the WebView.
// If running in a standard browser, this will likely fail or do nothing unless a plugin is used.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
    interface Window {
        sunmiInnerPrinter?: any;
    }
}

export const PrinterService = {

    // Check if printer exists
    checkPrinter: () => {
        if (window.sunmiInnerPrinter) {
            return true;
        }
        console.warn('Sunmi Printer Not Found');
        return false;
    },

    // Format and Print Receipt
    printReceipt: async (order: any, items: any[], showAlert?: any) => {
        const printer = window.sunmiInnerPrinter;

        if (!printer) {
            console.log('Mock Print (No Hardware):', order, items);
            if (showAlert) showAlert('Printer Not Found', 'Printer not found. Mock print logged to console.', 'info');
            else console.log('Printer not found. Mock print logged to console.');
            return;
        }

        try {
            // Initialize
            printer.printerInit();
            printer.printerSetAlignment(1); // Center
            printer.printerSetTextSize(36);
            printer.printerText("RESVI RESTAURANT\n"); // Name of place
            printer.printerSetTextSize(24);
            printer.printerText("--------------------------------\n");

            // Table Info
            printer.printerSetAlignment(0); // Left
            printer.printerText(`Table: ${order.table_info?.table_name || 'Quick Order'}\n`);
            printer.printerText(`Date: ${new Date().toLocaleString()}\n`);
            printer.printerText(`Order #: ${order.id.slice(0, 8)}\n`);
            printer.printerText("--------------------------------\n");

            // Items
            items.forEach((item: any) => {
                const name = item.name.substring(0, 20).padEnd(20, ' ');
                const qty = item.quantity.toString().padEnd(4, ' ');
                const price = (item.price * item.quantity).toFixed(2).padStart(8, ' ');

                printer.printerText(`${qty}${name}${price}\n`);

                if (item.modifiers && item.modifiers.length > 0) {
                    item.modifiers.forEach((mod: any) => {
                        printer.printerText(`   + ${mod.name}\n`);
                    });
                }
            });

            printer.printerText("--------------------------------\n");

            // Totals
            printer.printerSetAlignment(2); // Right
            printer.printerText(`Total: $${order.total_amount.toFixed(2)}\n`);

            // Footer
            printer.printerSetAlignment(1); // Center
            printer.printerText("\nThank you for dining with us!\n");
            printer.printerText("\n\n\n"); // Feed line

            // Use this if specific model requires explicit print or feed command
            // printer.printAndFeed(3); 

        } catch (e) {
            console.error('Printing Error:', e);
            if (showAlert) showAlert('Printing Error', 'Failed to print receipt.', 'error');
            else console.error('Failed to print receipt.');
        }
    }
};
