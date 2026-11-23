import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './App.css';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import Hero from './components/custom/Hero.jsx';
import CreateTrip from './create-trip/index.jsx';
import Header from './components/custom/Header.jsx';
import { Toaster } from './components/ui/sonner.jsx';
import Viewtrip from './view-trip/[tripId]/index.jsx';
import MyTrips from './my-trips/index.jsx';
import Admin from './admin/index.jsx';

function Layout(){ return <><Header/><Outlet/></>; }
const router=createBrowserRouter([{path:'/',element:<Layout/>,children:[
  {index:true,element:<Hero/>},
  {path:'create-trip',element:<CreateTrip/>},
  {path:'view-trip/:tripId',element:<Viewtrip/>},
  {path:'my-trips',element:<MyTrips/>},
  {path:'admin',element:<Admin/>},
]}]);
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><Toaster/><RouterProvider router={router}/></React.StrictMode>);
