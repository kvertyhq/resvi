import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface POSQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableId: string;
    tableName: string;
    restaurantId: string;
}

const POSQRModal: React.FC<POSQRModalProps> = ({ isOpen, onClose, tableId, tableName, restaurantId }) => {
    if (!isOpen) return null;

    // Use current origin or configurable domain
    const baseUrl = window.location.origin;
    const menuUrl = `${baseUrl}/#/menu/${tableId}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-800">Scan to Order</h2>
                <p className="text-gray-500 text-sm">Table: {tableName}</p>

                <div className="p-4 border-2 border-gray-200 rounded-xl">
                    <QRCodeCanvas
                        value={menuUrl}
                        size={200}
                        level={"H"}
                        includeMargin={true}
                    />
                </div>

                <p className="text-xs text-gray-400 font-mono break-all text-center px-4">
                    {menuUrl}
                </p>

                <div className="flex gap-2 w-full pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex-1 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-500 shadow-lg"
                    >
                        Print
                    </button>
                </div>
            </div>
        </div>
    );
};

export default POSQRModal;
