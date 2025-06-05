import { useState, useEffect, useCallback } from 'react';

const useMobileDetection = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  // Memoized function to check and set mobile status
  const checkIfMobile = useCallback(() => {
    setIsMobile(window.innerWidth < breakpoint);
  }, [breakpoint]); // Recalculate if breakpoint changes

  useEffect(() => {
    checkIfMobile(); // Initial check when component mounts

    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);

    // Cleanup: Remove event listener when component unmounts
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, [checkIfMobile]); // Dependency: checkIfMobile to ensure it's up-to-date

  return isMobile;
};

export default useMobileDetection;