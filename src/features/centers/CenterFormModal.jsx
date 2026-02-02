import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

function CenterFormModal({ isOpen, onClose, center, onSubmit, isSubmitting }) {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        phone: ''
    });

    useEffect(() => {
        if (center) {
            setFormData({
                name: center.name || '',
                address: center.address || '',
                city: center.city || '',
                phone: center.phone || ''
            });
        } else {
            setFormData({
                name: '',
                address: '',
                city: '',
                phone: ''
            });
        }
    }, [center, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const dialogTitle = center ? 'עריכת מרכז' : 'הוספת מרכז חדש';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={dialogTitle}
            size="small"
        >
            <form onSubmit={handleSubmit}>
                <Modal.Body>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <Input
                            name="name"
                            label="שם המרכז"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            autoFocus
                        />
                        <Input
                            name="address"
                            label="כתובת"
                            value={formData.address}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            name="city"
                            label="עיר"
                            value={formData.city}
                            onChange={handleChange}
                        />
                        <Input
                            type="tel"
                            name="phone"
                            label="טלפון"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        ביטול
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner size="small" color="white" /> : (center ? 'שמור שינויים' : 'צור מרכז')}
                    </Button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}

export default CenterFormModal;
