Module.register("MMM-DHT-Sensor", {
    defaults: {
        updateInterval: 30000,
        animationSpeed: 2000,
        apiUrl: "http://192.168.1.41/data",
        showHumidity: true,
        showTemperature: true,
        showPressure: false,
        temperatureUnit: "C",
        pressureUnit: "hPa",
        title: "Метео",
        decimals: 1,
        showIcons: true,
        iconSize: "20px",
        useCustomIcons: false,
        customIcons: {
            temperature: "fa-thermometer-half",
            humidity: "fa-tint",
            pressure: "fa-tachometer-alt"
        },
        style: "default" // default, minimalist, cards
    },

    start: function() {
        this.temperature = null;
        this.humidity = null;
        this.pressure = null;
        this.loaded = false;
        this.error = null;
        this.scheduleUpdate();
    },

    getStyles: function() {
        return [
            "MMM-DHT-Sensor.css",
            "font-awesome.css"
        ];
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "dht-sensor-wrapper";
        
        if (this.error) {
            wrapper.innerHTML = `<div class="error">${this.error}</div>`;
            return wrapper;
        }
        
        if (!this.loaded) {
            wrapper.innerHTML = `<div class="loading">Загрузка...</div>`;
            return wrapper;
        }

        if (this.config.title) {
            const title = document.createElement("div");
            title.className = "title bright medium";
            title.innerHTML = this.config.title;
            wrapper.appendChild(title);
        }

        const dataContainer = document.createElement("div");
        dataContainer.className = `dht-data ${this.config.style}`;
        
        if (this.config.showTemperature && this.temperature !== null) {
            dataContainer.appendChild(this.createTemperatureElement());
        }
        
        if (this.config.showHumidity && this.humidity !== null) {
            dataContainer.appendChild(this.createHumidityElement());
        }
        
        if (this.config.showPressure && this.pressure !== null) {
            dataContainer.appendChild(this.createPressureElement());
        }
        
        wrapper.appendChild(dataContainer);
        return wrapper;
    },

    createTemperatureElement: function() {
        const tempDiv = document.createElement("div");
        tempDiv.className = "temperature";
        
        if (this.config.showIcons) {
            const icon = document.createElement("span");
            icon.className = "icon";
            icon.innerHTML = this.getTemperatureIcon();
            tempDiv.appendChild(icon);
        }
        
        const valueContainer = document.createElement("span");
        valueContainer.className = "value-container";
        
        const tempValue = document.createElement("span");
        tempValue.className = "value bright";
        tempValue.innerHTML = this.formatTemperature(this.temperature);
        
        const tempUnit = document.createElement("span");
        tempUnit.className = "unit";
        tempUnit.innerHTML = this.getTemperatureUnitSymbol();
        
        valueContainer.appendChild(tempValue);
        valueContainer.appendChild(tempUnit);
        tempDiv.appendChild(valueContainer);
        
        // Добавляем анимацию обновления
        setTimeout(() => {
            tempDiv.classList.add('updating');
            setTimeout(() => tempDiv.classList.remove('updating'), 1000);
        }, 100);
        
        return tempDiv;
    },

    createHumidityElement: function() {
        const humDiv = document.createElement("div");
        humDiv.className = "humidity";
        
        if (this.config.showIcons) {
            const icon = document.createElement("span");
            icon.className = "icon";
            icon.innerHTML = this.getHumidityIcon();
            humDiv.appendChild(icon);
        }
        
        const valueContainer = document.createElement("span");
        valueContainer.className = "value-container";
        
        const humValue = document.createElement("span");
        humValue.className = "value bright";
        humValue.innerHTML = this.humidity.toFixed(this.config.decimals);
        
        const humUnit = document.createElement("span");
        humUnit.className = "unit";
        humUnit.innerHTML = "%";
        
        valueContainer.appendChild(humValue);
        valueContainer.appendChild(humUnit);
        humDiv.appendChild(valueContainer);
        
        setTimeout(() => {
            humDiv.classList.add('updating');
            setTimeout(() => humDiv.classList.remove('updating'), 1000);
        }, 200);
        
        return humDiv;
    },

    createPressureElement: function() {
        const presDiv = document.createElement("div");
        presDiv.className = "pressure";
        
        if (this.config.showIcons) {
            const icon = document.createElement("span");
            icon.className = "icon";
            icon.innerHTML = this.getPressureIcon();
            presDiv.appendChild(icon);
        }
        
        const valueContainer = document.createElement("span");
        valueContainer.className = "value-container";
        
        const presValue = document.createElement("span");
        presValue.className = "value bright";
        presValue.innerHTML = this.formatPressure(this.pressure);
        
        const presUnit = document.createElement("span");
        presUnit.className = "unit";
        presUnit.innerHTML = this.getPressureUnitSymbol();
        
        valueContainer.appendChild(presValue);
        valueContainer.appendChild(presUnit);
        presDiv.appendChild(valueContainer);
        
        setTimeout(() => {
            presDiv.classList.add('updating');
            setTimeout(() => presDiv.classList.remove('updating'), 1000);
        }, 300);
        
        return presDiv;
    },

    getTemperatureIcon: function() {
        if (this.config.useCustomIcons && this.config.customIcons.temperature) {
            return `<i class="fas ${this.config.customIcons.temperature}"></i>`;
        }
        return `<i class="fas fa-thermometer-half"></i>`;
    },

    getHumidityIcon: function() {
        if (this.config.useCustomIcons && this.config.customIcons.humidity) {
            return `<i class="fas ${this.config.customIcons.humidity}"></i>`;
        }
        return `<i class="fas fa-tint"></i>`;
    },

    getPressureIcon: function() {
        if (this.config.useCustomIcons && this.config.customIcons.pressure) {
            return `<i class="fas ${this.config.customIcons.pressure}"></i>`;
        }
        return `<i class="fas fa-tachometer-alt"></i>`;
    },

    scheduleUpdate: function() {
        const self = this;
        setInterval(function() {
            self.updateData();
        }, this.config.updateInterval);
        
        this.updateData();
    },

    updateData: function() {
        const self = this;
        
        fetch(this.config.apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Ошибка HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                self.processData(data);
            })
            .catch(error => {
                self.error = error.message;
                self.loaded = true;
                self.updateDom(self.config.animationSpeed);
                
                setTimeout(() => self.updateData(), 5000);
            });
    },

    processData: function(data) {
        let temperature = null;
        let humidity = null;
        let pressure = null;
        
        if (data.temperature !== undefined) {
            temperature = parseFloat(data.temperature);
        } else if (data.temp !== undefined) {
            temperature = parseFloat(data.temp);
        }
        
        if (data.humidity !== undefined) {
            humidity = parseFloat(data.humidity);
        } else if (data.hum !== undefined) {
            humidity = parseFloat(data.hum);
        }
        
        if (data.pressure !== undefined) {
            pressure = parseFloat(data.pressure);
        } else if (data.pres !== undefined) {
            pressure = parseFloat(data.pres);
        } else if (data.pressure_hpa !== undefined) {
            pressure = parseFloat(data.pressure_hpa);
        }
        
        if (this.config.temperatureUnit === "C" && temperature !== null && temperature > 100) {
            temperature = (temperature - 32) * 5/9;
        }
        
        this.temperature = temperature;
        this.humidity = humidity;
        this.pressure = pressure;
        this.error = null;
        this.loaded = true;
        
        this.updateDom(this.config.animationSpeed);
        
        if (temperature !== null) this.sendNotification("DHT_TEMPERATURE", temperature);
        if (humidity !== null) this.sendNotification("DHT_HUMIDITY", humidity);
        if (pressure !== null) this.sendNotification("DHT_PRESSURE", pressure);
    },

    formatTemperature: function(temp) {
        if (temp === null) return "--";
        
        let formattedTemp = temp;
        
        if (this.config.temperatureUnit === "F") {
            formattedTemp = (temp * 9/5) + 32;
        }
        
        return formattedTemp.toFixed(this.config.decimals);
    },

    formatPressure: function(pres) {
        if (pres === null) return "--";
        
        let formattedPres = pres;
        
        if (this.config.pressureUnit === "mmHg") {
            formattedPres = pres * 0.750062;
        }
        
        return formattedPres.toFixed(this.config.decimals);
    },

    getTemperatureUnitSymbol: function() {
        return this.config.temperatureUnit === "C" ? "°C" : "°F";
    },

    getPressureUnitSymbol: function() {
        return this.config.pressureUnit === "hPa" ? " hPa" : " мм рт.ст.";
    }
});