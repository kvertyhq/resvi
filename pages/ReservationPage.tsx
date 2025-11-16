import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { supabase } from '../supabaseClient';

const timeSlots = ['12:00', '12:30', '13:00', '13:30', '18:00', '18:30', '19:00', '19:30'];
const peopleOptions = [1, 2, 3, 4];

const ReservationPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('');
  const [person, setPerson] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleNext = () => {
    setStep(step + 1);
  };

  const handlePrev = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError("Please select a date.");
      return;
    }

    const bookingData = {
      p_booking_date: date.toISOString().split('T')[0],
      p_booking_time: `${time}:00`,
      p_guest_count: person,
      p_name: name,
      p_phone: phone,
      p_notes: notes,
      p_auto_confirm: false,
      p_table_count: Math.ceil(person / 4),
      p_user_id: null, // Set to null as per task
    };

    try {
      const { error } = await supabase.rpc('create_booking', bookingData);

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
      setError(null);
    } catch (error: any) {
      setError(error.message);
      console.error("Error creating booking:", error);
    }
  };

  if (isSubmitted) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold text-green-500 mb-4">Booking Successful!</h1>
        <p>Your table has been reserved. A confirmation email has been sent to {email}.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-4">Book a Table</h1>
      <p className="text-center text-gray-600 mb-8">
        We are happy to welcome you to our restaurant. Please use the form below to book a table.
      </p>
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-8">Reserve a Table</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4">1/3 Please Select a date</h2>
            <div className="flex justify-center">
              <DayPicker
                mode="single"
                selected={date}
                onSelect={setDate}
              />
            </div>
            <div className="flex justify-end mt-8">
              <button
                onClick={handleNext}
                disabled={!date}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-4">2/3 Select time and guests</h2>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Time</h3>
              <div className="grid grid-cols-4 gap-4">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setTime(slot)}
                    className={`p-2 border rounded-md ${time === slot ? 'bg-yellow-500 text-white' : 'border-gray-300'}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">How many people?</h3>
              <div className="grid grid-cols-4 gap-4">
                {peopleOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setPerson(option)}
                    className={`p-2 border rounded-md ${person === option ? 'bg-yellow-500 text-white' : 'border-gray-300'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between mt-8">
              <button
                onClick={handlePrev}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Prev
              </button>
              <button
                onClick={handleNext}
                disabled={!time || !person}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-bold mb-4">3/3 Please fill with your details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="First and Last Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="p-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="tel"
                placeholder="Your Telephone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <textarea
              placeholder="Please provide any additional info"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
            />
            <div className="flex justify-between mt-8">
              <button
                onClick={handlePrev}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Prev
              </button>
              <button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
              >
                Submit
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReservationPage;