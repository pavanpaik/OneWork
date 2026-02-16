import { useState, useRef, useEffect } from 'react';

interface InputBoxProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

function InputBox({ onSend, disabled }: InputBoxProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="input-box">
      <textarea
        ref={inputRef}
        className="input-field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What would you like to do?"
        disabled={disabled}
        rows={1}
      />
      <button
        className="send-button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </div>
  );
}

export default InputBox;
