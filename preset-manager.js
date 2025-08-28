const PresetManagerFactory = () => {
    const presets = {};
    let presetCounter = 0;

    const savePreset = (name, data) => {
        presets[name] = data;
    };
    const getPreset = (name) => presets[name] || null;
    const getPresetNames = () => Object.keys(presets);

    const updatePresetSelect = (selector) => {
        const selectElement = document.querySelector(selector);
        if (!selectElement) return;

        // Clear existing options
        selectElement.innerHTML = '<option value="">Select a Preset</option>';

        const presetNames = getPresetNames();
        presetNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selectElement.appendChild(option);
        });
    };

    const setup = (config) => {
        const {
            presetNamePrefix,
            getInitialData,
            applyData,
            animateData,
            selectors,
        } = config;

        const saveButton = document.querySelector(selectors.saveButton);
        const applyButton = document.querySelector(selectors.applyButton);
        const animateButton = document.querySelector(selectors.animateButton);

        if (saveButton) {
            saveButton.addEventListener('click', () => {
                const currentData = getInitialData();
                presetCounter++;
                const presetName = presetNamePrefix + presetCounter;
                savePreset(presetName, currentData);
                updatePresetSelect(selectors.presetSelect);
            });
        }

        if (applyButton) {
            applyButton.addEventListener('click', () => {
                const selectElement = document.querySelector(selectors.presetSelect);
                const selectedPreset = selectElement ? selectElement.value : null;
                if (selectedPreset) {
                    const presetData = getPreset(selectedPreset);
                    if (presetData) {
                        applyData(presetData);
                    }
                }
            });
        }

        if (animateButton) {
            animateButton.addEventListener('click', () => {
                const selectElement = document.querySelector(selectors.presetSelect);
                const selectedPreset = selectElement ? selectElement.value : null;
                if (!selectedPreset) return;
                const targetPreset = getPreset(selectedPreset);
                if (!targetPreset) return;
                animateData(targetPreset);
            });
        }

        // Save initial state as a default preset
        if (saveButton) {
            saveButton.click();
        }
    };

    return { savePreset, getPreset, getPresetNames, setup };
};
