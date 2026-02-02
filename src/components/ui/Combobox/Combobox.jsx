import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './Combobox.module.css';

/**
 * Combobox Component
 * allows selecting from a dropdown OR typing a custom value.
 * 
 * @param {Object} props
 * @param {string[]} props.options - Array of string options
 * @param {string} props.value - Current value
 * @param {function} props.onChange - Callback with new value
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.label - Optional label
 */
function Combobox({ options = [], value, onChange, placeholder, label }) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const containerRef = useRef(null);

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);
        if (!isOpen) setIsOpen(true);
    };

    const handleOptionClick = (option) => {
        setInputValue(option);
        onChange(option);
        setIsOpen(false);
    };

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
        <div className={styles.container} ref={containerRef}>
            {label && (
                <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    {label}
                </label>
            )}
            <div className={styles.inputWrapper}>
                <input
                    type="text"
                    className={styles.input}
                    value={inputValue}
                    onChange={handleInputChange}
                    onClick={() => setIsOpen(true)}
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    className={styles.toggleButton}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {isOpen && (
                <div className={styles.dropdown}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                className={`${styles.option} ${option === value ? styles.selected : ''}`}
                                onClick={() => handleOptionClick(option)}
                            >
                                {option}
                            </div>
                        ))
                    ) : (
                        <div className={styles.noOptions}>
                            {inputValue ? 'לחץ כדי לאשר בחירה אישית' : 'אין אפשרויות'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Combobox;
