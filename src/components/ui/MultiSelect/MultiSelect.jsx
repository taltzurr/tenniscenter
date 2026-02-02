import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './MultiSelect.module.css';

/**
 * MultiSelect Component
 * Allows selecting multiple items from a list or entering custom tags.
 * 
 * @param {Object} props
 * @param {string[]} props.options - Available options for autocomplete
 * @param {string[]} props.value - Array of selected strings
 * @param {function} props.onChange - Callback with new array
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.label - Label text
 */
function MultiSelect({ options = [], value = [], onChange, placeholder, label }) {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Filter suggestions that are not already selected
    const suggestions = options.filter(opt =>
        opt.toLowerCase().includes(inputValue.toLowerCase()) &&
        !value.includes(opt)
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            removeTag(value[value.length - 1]);
        }
    };

    const addTag = (tag) => {
        const trimmed = tag.trim();
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed]);
        }
        setInputValue('');
        setShowSuggestions(false);
    };

    const removeTag = (tagToRemove) => {
        onChange(value.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className={styles.container} ref={containerRef}>
            {label && <label className={styles.label}>{label}</label>}

            <div
                className={styles.inputWrapper}
                onClick={() => inputRef.current?.focus()}
            >
                {value.map((tag, index) => (
                    <span key={index} className={styles.tag}>
                        {tag}
                        <button
                            type="button"
                            className={styles.removeButton}
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(tag);
                            }}
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}

                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    placeholder={value.length === 0 ? placeholder : ''}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                />
            </div>

            {showSuggestions && inputValue && suggestions.length > 0 && (
                <div className={styles.suggestions}>
                    {suggestions.map((option, index) => (
                        <div
                            key={index}
                            className={styles.option}
                            onClick={() => addTag(option)}
                        >
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MultiSelect;
