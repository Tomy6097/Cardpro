// Redirect to GuestList — used when no specific event is selected
import React from 'react';
import { Navigate } from 'react-router-dom';

const Guests = () => <Navigate to="/events" replace />;

export default Guests;
