import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReservationPage } from './ReservationPage';
import { supabase } from '../supabaseClient';

// Mock the supabase client
jest.mock('../supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

describe('ReservationPage', () => {
  it('should submit the form and show a success message', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    render(<ReservationPage />);

    // Step 1: Select a date
    fireEvent.click(screen.getByText('Next'));

    // Step 2: Select time and guests
    fireEvent.click(screen.getByText('12:00'));
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('Next'));

    // Step 3: Fill in details and submit
    fireEvent.change(screen.getByPlaceholderText('First and Last Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Your Email'), { target: { value: 'john.doe@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Your Telephone'), { target: { value: '1234567890' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('create_booking', {
        p_booking_date: expect.any(String),
        p_booking_time: '12:00:00',
        p_guest_count: 2,
        p_name: 'John Doe',
        p_phone: '1234567890',
        p_notes: '',
        p_auto_confirm: false,
        p_table_count: 1,
        p_user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Booking Successful!')).toBeInTheDocument();
    });
  });
});
