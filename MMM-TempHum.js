Module.register("MMM-TempHum", {
    defaults: {
        updateInterval: 30000,
        animationSpeed: 2000,
        apiUrl: "http://192.168.1.41/data",
        showHumidity: true,
        showTemperature: true,
        temperatureUnit: "C",
        title: "Температура и влажность",
        decimals: 1
    },

    start: function() {
        this.temperature = null;
        this.humidity = null;
        this.loaded = false;
        this.error = null;
        this.scheduleUpdate();
    },

    getStyles: function() {
        return ["MMM-TempHum.css"];
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
        dataContainer.className = "dht-data";
        
        if (this.config.showTemperature && this.temperature !== null) {
            const tempDiv = document.createElement("div");
            tempDiv.className = "temperature";
            
            const tempValue = document.createElement("span");
            tempValue.className = "value bright";
            tempValue.innerHTML = this.formatTemperature(this.temperature);
            
            const tempUnit = document.createElement("span");
            tempUnit.className = "unit";
            tempUnit.innerHTML = this.getTemperatureUnitSymbol();
            
            tempDiv.appendChild(tempValue);
            tempDiv.appendChild(tempUnit);
            dataContainer.appendChild(tempDiv);
        }
        
        if (this.config.showHumidity && this.humidity !== null) {
            const humDiv = document.createElement("div");
            humDiv.className = "humidity";
            
            const humValue = document.createElement("span");
            humValue.className = "value bright";
            humValue.innerHTML = this.humidity.toFixed(this.config.decimals);
            
            const humUnit = document.createElement("span");
            humUnit.className = "unit";
            humUnit.innerHTML = "%";
            
            humDiv.appendChild(humValue);
            humDiv.appendChild(humUnit);
            dataContainer.appendChild(humDiv);
        }
        
        wrapper.appendChild(dataContainer);
        return wrapper;
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
        
        if (this.config.temperatureUnit === "C" && temperature !== null && temperature > 100) {
            temperature = (temperature - 32) * 5/9;
        }
        
        this.temperature = temperature;
        this.humidity = humidity;
        this.error = null;
        this.loaded = true;
        
        this.updateDom(this.config.animationSpeed);
        
        if (temperature !== null) {
            this.sendNotification("DHT_TEMPERATURE", temperature);
        }
        if (humidity !== null) {
            this.sendNotification("DHT_HUMIDITY", humidity);
        }
    },

    formatTemperature: function(temp) {
        if (temp === null) return "N/A";
        
        let formattedTemp = temp;
        
        if (this.config.temperatureUnit === "F") {
            formattedTemp = (temp * 9/5) + 32;
        }
        
        return formattedTemp.toFixed(this.config.decimals);
    },

    getTemperatureUnitSymbol: function() {
        return this.config.temperatureUnit === "C" ? "°C" : "°F";
    }
});