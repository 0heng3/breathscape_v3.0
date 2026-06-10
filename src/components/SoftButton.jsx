import React from 'react';

function SoftButton({ children, className = '', variant = 'primary', ...props }) {
  return (
    <button className={`soft-button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export default SoftButton;
