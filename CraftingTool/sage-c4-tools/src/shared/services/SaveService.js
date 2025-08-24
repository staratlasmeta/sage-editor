class SaveService {
    static STORAGE_KEY = 'sage_c4_tools_save';
    static AUTO_SAVE_KEY = 'sage_c4_tools_autosave';

    static save(data, slot = 'default') {
        try {
            const saveData = {
                version: '1.0.0',
                timestamp: Date.now(),
                slot,
                data
            };
            localStorage.setItem(`${this.STORAGE_KEY}_${slot}`, JSON.stringify(saveData));
            return true;
        } catch (error) {
            console.error('Failed to save:', error);
            return false;
        }
    }

    static load(slot = 'default') {
        try {
            const saved = localStorage.getItem(`${this.STORAGE_KEY}_${slot}`);
            if (saved) {
                const { data } = JSON.parse(saved);
                return data;
            }
            return null;
        } catch (error) {
            console.error('Failed to load save:', error);
            return null;
        }
    }

    static autoSave(data) {
        this.save(data, 'autosave');
    }

    static exportSave(data) {
        const saveData = {
            version: '1.0.0',
            timestamp: Date.now(),
            data
        };
        const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sage_c4_save_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static async importSave(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const { data } = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    static getSaveSlots() {
        const slots = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.STORAGE_KEY)) {
                try {
                    const saved = JSON.parse(localStorage.getItem(key));
                    slots.push({
                        slot: saved.slot,
                        timestamp: saved.timestamp,
                        version: saved.version
                    });
                } catch (error) {
                    console.error('Invalid save slot:', key);
                }
            }
        }
        return slots;
    }
}

export default SaveService;