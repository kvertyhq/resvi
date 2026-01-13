import React from 'react';
import { Route, Routes } from 'react-router-dom';

const POSPage: React.FC = () => {
    return (
        <div className="flex-1 bg-gray-900 relative">
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">POS Dashboard</h2>
                    <p>Select a mode from the sidebar to begin.</p>
                </div>
            </div>

            <Routes>
                {/* We will add sub-routes here like /tables, /order/:tableId, etc. */}
            </Routes>
        </div>
    );
};

export default POSPage;
