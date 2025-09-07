import { z } from 'zod';

export const createContext = ({ req, res }) => {
  return {
    req,
    res,
    // Add any additional context here
  };
};
