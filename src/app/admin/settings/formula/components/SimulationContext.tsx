import { createContext } from 'react';

export const SimulationContext = createContext<any>({ settings: {}, wallets: {}, plans: [] });
