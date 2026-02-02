import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

function PlayerFormModal({ isOpen, onClose, player, groupId, onSubmit, isSubmitting }) {
    const [formData, setFormData] = useState({
        displayName: '',
        birthDate: '',
        phone: '',
        parentName: '',
        parentPhone: '',
        medicalNotes: '',
    });

    useEffect(() => {
        if (player) {
            setFormData({
                displayName: player.displayName || '',
                birthDate: player.birthDate || '',
                phone: player.phone || '',
                parentName: player.parentName || '',
                parentPhone: player.parentPhone || '',
                medicalNotes: player.medicalNotes || '',
            });
        } else {
            setFormData({
                displayName: '',
                birthDate: '',
                phone: '',
                parentName: '',
                parentPhone: '',
                medicalNotes: '',
            });
        }
    }, [player, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Prepare payload
        const payload = { ...formData };
        if (!player) {
            // New player: Attach to current group
            payload.groupIds = [groupId];
        }
        // If editing, we assume groupIds are preserved or handled elsewhere if we support multi-group editing (out of scope for now)

        onSubmit(payload);
    };

    const dialogTitle = player ? 'עריכת שחקן' : 'הוספת שחקן חדש';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={dialogTitle}
            size="medium"
        >
            <form onSubmit={handleSubmit}>
                <Modal.Body>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                        {/* Personal Info */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-secondary)' }}>פרטי השחקן</h3>
                        </div>

                        <Input
                            name="displayName"
                            label="שם מלא"
                            value={formData.displayName}
                            onChange={handleChange}
                            required
                            autoFocus
                        />

                        <Input
                            type="date"
                            name="birthDate"
                            label="תאריך לידה"
                            value={formData.birthDate}
                            onChange={handleChange}
                        />

                        <Input
                            type="tel"
                            name="phone"
                            label="טלפון (שחקן)"
                            value={formData.phone}
                            onChange={handleChange}
                        />

                        {/* Parent Info */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-secondary)' }}>פרטי הורים</h3>
                        </div>

                        <Input
                            name="parentName"
                            label="שם הורה"
                            value={formData.parentName}
                            onChange={handleChange}
                        />

                        <Input
                            type="tel"
                            name="parentPhone"
                            label="טלפון הורה"
                            value={formData.parentPhone}
                            onChange={handleChange}
                        />

                        {/* Medical / Notes */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                            <Input
                                multiline
                                rows={3}
                                name="medicalNotes"
                                label="הערות רפואיות / חשובות"
                                value={formData.medicalNotes}
                                onChange={handleChange}
                                placeholder="רגישויות, בעיות בריאות וכו'"
                            />
                        </div>
                    </div>
                </Modal.Body>

                <Modal.Footer>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        ביטול
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner size="small" color="white" /> : (player ? 'שמור שינויים' : 'הוסף שחקן')}
                    </Button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}

export default PlayerFormModal;
