import React, { createContext, useContext } from 'react';

const DataContext = createContext(null);

export const DataProvider = ({ children, value }) => {
    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useGameData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useGameData must be used within DataProvider');
    }
    return context;
};
