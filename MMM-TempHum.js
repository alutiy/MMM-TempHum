Module.register("MMM-TempHum", {
    defaults: {
        updateInterval: 30000, // 30 секунд
        animationSpeed: 2000,
        apiUrl: "http://192.168.1.41/data",
        showHumidity: true,
        showTemperature: true,
        temperatureUnit: "C", // C или F
        title: "Температура и влажность",
        decimals: 1,
        retryDelay: 5000,
        useRelativeUrl: false // Если true, используется относительный URL
    },

    start: function() {
        Log.info(`Starting module: ${this.name}`);
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

        // Заголовок
        if (this.config.title) {
            const title = document.createElement("div");
            title.className = "title bright medium";
            title.innerHTML = this.config.title;
            wrapper.appendChild(title);
        }

        const dataContainer = document.createElement("div");
        dataContainer.className = "dht-data";
        
        // Температура
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
        
        // Влажность
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
        const url = this.config.apiUrl;
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                self.processData(data);
            })
            .catch(error => {
                console.error(`[${self.name}] Ошибка получения данных:`, error);
                self.error = `Ошибка подключения: ${error.message}`;
                self.loaded = true;
                self.updateDom(self.config.animationSpeed);
                
                // Повторная попытка через retryDelay
                setTimeout(() => self.updateData(), self.config.retryDelay);
            });
    },

    processData: function(data) {
        // Ожидаем JSON вида: {"temperature": 23.5, "humidity": 45.2}
        // Или возможно с другими названиями полей
        
        let temperature = null;
        let humidity = null;
        
        // Проверяем различные варианты названий полей
        if (data.temperature !== undefined) {
            temperature = parseFloat(data.temperature);
        } else if (data.temp !== undefined) {
            temperature = parseFloat(data.temp);
        } else if (data.Temperature !== undefined) {
            temperature = parseFloat(data.Temperature);
        }
        
        if (data.humidity !== undefined) {
            humidity = parseFloat(data.humidity);
        } else if (data.hum !== undefined) {
            humidity = parseFloat(data.hum);
        } else if (data.Humidity !== undefined) {
            humidity = parseFloat(data.Humidity);
        }
        
        // Если данные в градусах Фаренгейта, конвертируем в Цельсий
        if (this.config.temperatureUnit === "C" && temperature !== null) {
            // Проверяем, не являются ли данные уже в Цельсиях
            if (temperature > 100) { // Предполагаем, что это Фаренгейт
                temperature = (temperature - 32) * 5/9;
            }
        }
        
        this.temperature = temperature;
        this.humidity = humidity;
        this.error = null;
        this.loaded = true;
        
        this.updateDom(this.config.animationSpeed);
        
        // Отправляем уведомления для других модулей
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
        
        // Конвертируем в Фаренгейт если нужно
        if (this.config.temperatureUnit === "F") {
            formattedTemp = (temp * 9/5) + 32;
        }
        
        return formattedTemp.toFixed(this.config.decimals);
    },

    getTemperatureUnitSymbol: function() {
        return this.config.temperatureUnit === "C" ? "°C" : "°F";
    },

    notificationReceived: function(notification, payload, sender) {
        if (notification === "DOM_OBJECTS_CREATED") {
            this.updateData();
        }
    }
});