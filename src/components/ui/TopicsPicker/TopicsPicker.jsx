import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import useAuthStore from '../../../stores/authStore';
import { TRAINING_TOPICS_BY_CATEGORY } from './topics';
import styles from './TopicsPicker.module.css';

function TopicsPicker({ value = [], onChange }) {
  const { userData, updateProfile } = useAuthStore();
  const customTopics = userData?.customTrainingTopics || [];

  const categories = [
    ...TRAINING_TOPICS_BY_CATEGORY,
    ...(customTopics.length > 0
      ? [{ id: 'custom', label: '⭐ שלי', topics: customTopics }]
      : []),
  ];

  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [freeText, setFreeText] = useState('');

  const activeCategoryTopics = categories.find(c => c.id === activeCategory)?.topics || [];

  const toggle = (topic) => {
    if (value.includes(topic)) {
      onChange(value.filter(t => t !== topic));
    } else {
      onChange([...value, topic]);
    }
  };

  const addCustomTopic = async () => {
    const trimmed = freeText.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    if (!customTopics.includes(trimmed)) {
      const updated = [...customTopics, trimmed];
      await updateProfile({ customTrainingTopics: updated });
    }
    setFreeText('');
  };

  const handleFreeTextKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTopic();
    }
  };

  const removeSelected = (topic) => {
    onChange(value.filter(t => t !== topic));
  };

  return (
    <div className={styles.container}>
      {value.length > 0 && (
        <div className={styles.selectedTags}>
          {value.map(tag => (
            <span key={tag} className={styles.tag}>
              {tag}
              <button type="button" className={styles.removeTag} onClick={() => removeSelected(tag)}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className={styles.tabsBar}>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`${styles.tab} ${activeCategory === cat.id ? styles.tabActive : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className={styles.chipsSection}>
        <div className={styles.chipsSectionHeader}>
          <span className={styles.chipsCategoryLabel}>
            {categories.find(c => c.id === activeCategory)?.label}
          </span>
          <span className={styles.chipsCount}>
            {activeCategoryTopics.length} נושאים
          </span>
        </div>
        <div className={styles.chipsGrid}>
          {activeCategoryTopics.map(topic => (
            <button
              key={topic}
              type="button"
              className={`${styles.chip} ${value.includes(topic) ? styles.chipSelected : ''}`}
              onClick={() => toggle(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.freeTextRow}>
        <input
          type="text"
          className={styles.freeTextInput}
          placeholder="הוסף נושא חופשי..."
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          onKeyDown={handleFreeTextKeyDown}
          dir="rtl"
        />
        <button
          type="button"
          className={styles.addButton}
          onClick={addCustomTopic}
          disabled={!freeText.trim()}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export default TopicsPicker;
