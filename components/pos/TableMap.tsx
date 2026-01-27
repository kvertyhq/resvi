import React, { useState, useEffect } from 'react';
import { DndContext, useDraggable, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../../supabaseClient';
import { useSettings } from '../../context/SettingsContext';

interface Table {
    id: string;
    table_name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'rectangle' | 'circle';
    count: number;
    zone: string;
    status?: 'available' | 'occupied' | 'billed' | 'reserved';
    activeOrders?: any[];
}

interface TableMapProps {
    tables: Table[];
    onTableUpdate: (id: string, x: number, y: number) => void;
    onTableClick: (table: Table) => void;
    isEditMode: boolean;
}

const DraggableTable: React.FC<{ table: Table; isEditMode: boolean; onClick: () => void }> = ({ table, isEditMode, onClick }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: table.id,
        disabled: !isEditMode,
        data: { x: table.x, y: table.y } // Pass original coords
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        left: `${table.x}px`,
        top: `${table.y}px`,
        width: `${table.width}px`,
        height: `${table.height}px`,
        position: 'absolute' as 'absolute',
    };

    const statusColor = {
        available: 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white',
        occupied: 'bg-red-100 dark:bg-red-900 border-red-200 dark:border-red-700 text-red-900 dark:text-red-100',
        billed: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100',
        reserved: 'bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100'
    }[table.status || 'available'];

    // Calculate total from all orders
    const totalAmount = table.activeOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    const orderCount = table.activeOrders?.length || 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={onClick}
            className={`
                flex flex-col items-center justify-center 
                border-2 shadow-lg cursor-pointer transition-colors
                ${statusColor}
                ${table.shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
                ${isEditMode ? 'cursor-move ring-2 ring-orange-500' : 'hover:brightness-110'}
            `}
        >
            <span className="font-bold text-lg">{table.table_name}</span>
            <span className="text-xs opacity-70 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {table.count}
            </span>
            <span className={`text-[10px] uppercase font-bold mt-1 px-2 py-0.5 rounded-full ${table.status === 'occupied' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-100' :
                table.status === 'billed' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                    table.status === 'reserved' ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                        'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }`}>
                {table.status === 'occupied' ? 'Active' :
                    table.status === 'billed' ? 'Bill Sent' :
                        table.status === 'reserved' ? 'Reserved' :
                            'Vacant'}
            </span>
            {orderCount > 0 && (
                <div className="mt-1 flex flex-col items-center">
                    {orderCount > 1 ? (
                        <span className="text-[10px] font-mono font-bold opacity-80">
                            {orderCount} Orders
                        </span>
                    ) : (
                        <span className="text-[10px] font-mono font-bold opacity-80">
                            #{table.activeOrders![0].daily_order_number || table.activeOrders![0].readable_id || table.activeOrders![0].id.slice(0, 4)}
                        </span>
                    )}
                    <span className="text-[10px] font-bold">
                        ${totalAmount.toFixed(2)}
                    </span>
                </div>
            )}
        </div>
    );
};

const TableMap: React.FC<TableMapProps> = ({ tables, onTableUpdate, onTableClick, isEditMode }) => {

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        // Calculate new position based on delta
        const original = active.data.current as { x: number, y: number };
        if (original) {
            onTableUpdate(active.id as string, original.x + delta.x, original.y + delta.y);
        }
    };

    return (
        <div className="relative w-full h-full min-w-[800px] min-h-[600px] bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner pattern-grid-lg text-gray-500 dark:text-gray-300 transition-colors duration-300">
            {/* Simple grid pattern via CSS class or inline SVG if needed */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #000000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            <DndContext onDragEnd={handleDragEnd}>
                {tables.map(table => (
                    <DraggableTable
                        key={table.id}
                        table={table}
                        isEditMode={isEditMode}
                        onClick={() => onTableClick(table)}
                    />
                ))}
            </DndContext>
        </div>
    );
};

export default TableMap;
