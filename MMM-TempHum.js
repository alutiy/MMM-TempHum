Module.register("MMM-TempHum", {
    defaults: {
        updateInterval: 30000,
        animationSpeed: 2000,
        apiUrl: "http://192.168.1.41/data",
        showHumidity: true,
        showTemperature: true,
        temperatureUnit: "C",
        title: "Температура и влажность",
        decimals: 1,
        retryDelay: 5000,
        useRelativeUrl: false,
        debug: true // Добавим режим отладки
    },

    start: function() {
        Log.info(`Starting module: ${this.name}`);
        this.temperature = null;
        this.humidity = null;
        this.loaded = false;
        this.error = null;
        this.lastUpdate = null;
        this.scheduleUpdate();
    },

    getStyles: function() {
        return ["MMM-TempHum.css"];
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "dht-sensor-wrapper";
        
        // Добавим отладочную информацию если включен debug
        if (this.config.debug && this.lastUpdate) {
            const debugInfo = document.createElement("div");
            debugInfo.className = "debug-info dimmed small";
            debugInfo.innerHTML = `Last update: ${this.lastUpdate.toLocaleTimeString()}`;
            wrapper.appendChild(debugInfo);
        }
        
        if (this.error) {
            const errorDiv = document.createElement("div");
            errorDiv.className = "error";
            errorDiv.innerHTML = this.error;
            wrapper.appendChild(errorDiv);
            return wrapper;
        }
        
        if (!this.loaded) {
            const loadingDiv = document.createElement("div");
            loadingDiv.className = "loading";
            loadingDiv.innerHTML = "Загрузка...";
            wrapper.appendChild(loadingDiv);
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
        
        // Задержка перед первым запросом
        setTimeout(() => {
            self.updateData();
        }, 1000);
    },

    updateData: function() {
        const self = this;
        const url = this.config.useRelativeUrl ? 
            `/data` : 
            this.config.apiUrl;
        
        if (this.config.debug) {
            console.log(`[${this.name}] Запрашиваю данные с: ${url}`);
        }
        
        // Добавляем таймаут для запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            mode: 'cors', // Важно для кросс-доменных запросов
            cache: 'no-cache'
        })
        .then(response => {
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Ответ не в формате JSON');
            }
            
            return response.json();
        })
        .then(data => {
            if (this.config.debug) {
                console.log(`[${this.name}] Получены данные:`, data);
            }
            self.processData(data);
        })
        .catch(error => {
            clearTimeout(timeoutId);
            
            let errorMessage = '';
            if (error.name === 'AbortError') {
                errorMessage = 'Таймаут запроса (10 сек)';
            } else if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                errorMessage = 'Ошибка сети: сервер недоступен';
            } else {
                errorMessage = error.message;
            }
            
            console.error(`[${self.name}] Ошибка получения данных:`, error);
            
            self.error = errorMessage;
            self.loaded = true;
            self.lastUpdate = new Date();
            self.updateDom(self.config.animationSpeed);
            
            // Повторная попытка
            setTimeout(() => self.updateData(), self.config.retryDelay);
        });
    },

    processData: function(data) {
        let temperature = null;
        let humidity = null;
        
        // Пробуем найти температуру в разных форматах
        const tempKeys = ['temperature', 'temp', 'Temperature', 'TEMPERATURE'];
        for (const key of tempKeys) {
            if (data[key] !== undefined && data[key] !== null) {
                temperature = parseFloat(data[key]);
                break;
            }
        }
        
        // Пробуем найти влажность в разных форматах
        const humKeys = ['humidity', 'hum', 'Humidity', 'HUMIDITY'];
        for (const key of humKeys) {
            if (data[key] !== undefined && data[key] !== null) {
                humidity = parseFloat(data[key]);
                break;
            }
        }
        
        // Логируем что нашли
        if (this.config.debug) {
            console.log(`[${this.name}] Найдены данные - Температура: ${temperature}, Влажность: ${humidity}`);
        }
        
        this.temperature = temperature;
        this.humidity = humidity;
        this.error = null;
        this.loaded = true;
        this.lastUpdate = new Date();
        
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
    },

    notificationReceived: function(notification, payload, sender) {
        if (notification === "DOM_OBJECTS_CREATED") {
            // Ждем немного перед первым запросом
            setTimeout(() => {
                this.updateData();
            }, 2000);
        }
    }
});