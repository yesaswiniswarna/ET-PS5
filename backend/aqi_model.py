import math
import random
from datetime import datetime, timedelta

# Presets for the supported Indian metros
CITY_PRESETS = {
    "Bengaluru": {
        "center": [12.9716, 77.5946],
        "base_aqi": 85,
        "wards": [
            {"name": "Koramangala", "lat": 12.9352, "lng": 77.6244, "base_aqi": 90, "type": "Residential/Commercial"},
            {"name": "Whitefield", "lat": 12.9698, "lng": 77.7499, "base_aqi": 140, "type": "IT/Construction Hub"},
            {"name": "Indiranagar", "lat": 12.9784, "lng": 77.6408, "base_aqi": 95, "type": "Commercial/Residential"},
            {"name": "Peenya", "lat": 13.0285, "lng": 77.5197, "base_aqi": 180, "type": "Industrial Area"},
            {"name": "Jayanagar", "lat": 12.9299, "lng": 77.5824, "base_aqi": 75, "type": "Green Residential"}
        ],
        "point_sources": [
            {"id": "blr_ind_peenya_1", "name": "Peenya Metal Electroplaters", "type": "Industry", "lat": 13.0310, "lng": 77.5150, "strength": 95},
            {"id": "blr_ind_peenya_2", "name": "Peenya Boiler Plant B", "type": "Industry", "lat": 13.0250, "lng": 77.5250, "strength": 80},
            {"id": "blr_const_wfd_1", "name": "Metro Line Expansion Block A", "type": "Construction", "lat": 12.9710, "lng": 77.7420, "strength": 90},
            {"id": "blr_const_wfd_2", "name": "Prestige Tech Park Phase 4", "type": "Construction", "lat": 12.9650, "lng": 77.7550, "strength": 85},
            {"id": "blr_traf_silkboard", "name": "Silk Board Junction Traffic", "type": "Traffic", "lat": 12.9176, "lng": 77.6225, "strength": 100},
            {"id": "blr_traf_tin_factory", "name": "Tin Factory Intersection", "type": "Traffic", "lat": 12.9961, "lng": 77.6750, "strength": 95}
        ],
        "receptors": [
            {"name": "St. John's Hospital", "type": "Hospital", "lat": 12.9334, "lng": 77.6244},
            {"name": "Whitefield Global School", "type": "School", "lat": 12.9750, "lng": 77.7520},
            {"name": "Peenya Primary Health Center", "type": "Hospital", "lat": 13.0280, "lng": 77.5200}
        ]
    },
    "Delhi": {
        "center": [28.6139, 77.2090],
        "base_aqi": 210,
        "wards": [
            {"name": "Connaught Place", "lat": 28.6304, "lng": 77.2177, "base_aqi": 220, "type": "Commercial Hub"},
            {"name": "Okhla Industrial Area", "lat": 28.5355, "lng": 77.2731, "base_aqi": 310, "type": "Industrial Area"},
            {"name": "Dwarka", "lat": 28.5921, "lng": 77.0460, "base_aqi": 195, "type": "Residential"},
            {"name": "Chandni Chowk", "lat": 28.6506, "lng": 77.2303, "base_aqi": 290, "type": "High Density Commercial"},
            {"name": "Punjabi Bagh", "lat": 28.6675, "lng": 77.1250, "base_aqi": 240, "type": "Residential/Traffic Junction"}
        ],
        "point_sources": [
            {"id": "del_ind_okhla_1", "name": "Okhla Allied Chemicals", "type": "Industry", "lat": 28.5320, "lng": 28.5320, "lat": 28.5300, "lng": 77.2790, "strength": 180},
            {"id": "del_ind_okhla_2", "name": "Okhla Waste-to-Energy Plant", "type": "Industry", "lat": 28.5390, "lng": 77.2680, "strength": 190},
            {"id": "del_const_cp", "name": "Central Vista Revamp Site D", "type": "Construction", "lat": 28.6220, "lng": 77.2210, "strength": 120},
            {"id": "del_const_dwk", "name": "Dwarka Expressway Segment 3", "type": "Construction", "lat": 28.5880, "lng": 77.0350, "strength": 150},
            {"id": "del_traf_ito", "name": "ITO Crossing Traffic Hotspot", "type": "Traffic", "lat": 28.6282, "lng": 77.2410, "strength": 160},
            {"id": "del_traf_dhaula_kuan", "name": "Dhaula Kuan Cloverleaf", "type": "Traffic", "lat": 28.5983, "lng": 77.1705, "strength": 140}
        ],
        "receptors": [
            {"name": "AIIMS Delhi", "type": "Hospital", "lat": 28.5672, "lng": 77.2100},
            {"name": "Modern School Barakhamba", "type": "School", "lat": 28.6310, "lng": 77.2280},
            {"name": "Holy Family Hospital Okhla", "type": "Hospital", "lat": 28.5600, "lng": 77.2740}
        ]
    },
    "Mumbai": {
        "center": [19.0760, 72.8777],
        "base_aqi": 110,
        "wards": [
            {"name": "Colaba", "lat": 18.9067, "lng": 72.8147, "base_aqi": 90, "type": "Coastal Residential"},
            {"name": "Bandra", "lat": 19.0596, "lng": 72.8295, "base_aqi": 115, "type": "Commercial/Residential"},
            {"name": "Kurla", "lat": 19.0728, "lng": 72.8826, "base_aqi": 160, "type": "Dense Commercial"},
            {"name": "Chembur", "lat": 19.0622, "lng": 72.8974, "base_aqi": 190, "type": "Industrial/Refinery Area"},
            {"name": "Andheri", "lat": 19.1136, "lng": 72.8697, "base_aqi": 130, "type": "Mixed Residential/Commercial"}
        ],
        "point_sources": [
            {"id": "mum_ind_tata", "name": "Trombay Thermal Power Chimney", "type": "Industry", "lat": 19.0020, "lng": 72.9350, "strength": 150},
            {"id": "mum_ind_refinery", "name": "Mahul Refinery Vent Stack", "type": "Industry", "lat": 19.0250, "lng": 72.9050, "strength": 170},
            {"id": "mum_const_coastal", "name": "Coastal Road Reclamation Area", "type": "Construction", "lat": 19.0300, "lng": 72.8150, "strength": 110},
            {"id": "mum_const_metro", "name": "Metro Line 3 Andheri Station", "type": "Construction", "lat": 19.1180, "lng": 72.8620, "strength": 90},
            {"id": "mum_traf_jvlr", "name": "JVLR Eastern Express Joint", "type": "Traffic", "lat": 19.1245, "lng": 72.9150, "strength": 120},
            {"id": "mum_traf_crawford", "name": "Crawford Market Bus Terminal", "type": "Traffic", "lat": 18.9472, "lng": 72.8350, "strength": 105}
        ],
        "receptors": [
            {"name": "KEM Hospital Parel", "type": "Hospital", "lat": 19.0025, "lng": 72.8420},
            {"name": "Aditya Birla World Academy", "type": "School", "lat": 18.9660, "lng": 72.8120},
            {"name": "Sushrusha Hospital Dadar", "type": "Hospital", "lat": 19.0220, "lng": 72.8390}
        ]
    },
    "Kolkata": {
        "center": [22.5726, 88.3639],
        "base_aqi": 135,
        "wards": [
            {"name": "Salt Lake", "lat": 22.5804, "88.4179": 88.4179, "lng": 88.4179, "base_aqi": 110, "type": "IT/Residential"},
            {"name": "Howrah", "lat": 22.5958, "lng": 88.2636, "base_aqi": 185, "type": "Industrial/Transit Hub"},
            {"name": "Park Street", "lat": 22.5487, "lng": 88.3516, "base_aqi": 140, "type": "Commercial High-Density"},
            {"name": "Topsia", "lat": 22.5292, "lng": 88.3931, "base_aqi": 190, "type": "Tannery/Small Industry"},
            {"name": "Behala", "lat": 22.4975, "lng": 88.3133, "base_aqi": 130, "type": "Residential Suburban"}
        ],
        "point_sources": [
            {"id": "kol_ind_howrah_1", "name": "Howrah Foundries Block A", "type": "Industry", "lat": 22.6050, "lng": 88.2520, "strength": 130},
            {"id": "kol_ind_topsia_1", "name": "Topsia Leather Exhausts", "type": "Industry", "lat": 22.5220, "lng": 88.3980, "strength": 110},
            {"id": "kol_const_metro", "name": "East-West Metro Howrah Bridge Site", "type": "Construction", "lat": 22.5850, "lng": 88.2750, "strength": 95},
            {"id": "kol_const_bypass", "name": "EM Bypass Flyover Casting", "type": "Construction", "lat": 22.5420, "lng": 88.4050, "strength": 100},
            {"id": "kol_traf_esplanade", "name": "Esplanade Tram & Bus Terminus", "type": "Traffic", "lat": 22.5645, "lng": 88.3510, "strength": 115},
            {"id": "kol_traf_shyambazar", "name": "Shyambazar Five-Point Crossing", "type": "Traffic", "lat": 22.6012, "lng": 88.3720, "strength": 110}
        ],
        "receptors": [
            {"name": "SSKM Hospital", "type": "Hospital", "lat": 22.5390, "lng": 88.3440},
            {"name": "La Martiniere for Boys", "type": "School", "lat": 22.5450, "lng": 88.3580},
            {"name": "Howrah District Hospital", "type": "Hospital", "lat": 22.5930, "lng": 88.2610}
        ]
    },
    "Chennai": {
        "center": [13.0827, 80.2707],
        "base_aqi": 80,
        "wards": [
            {"name": "Adyar", "lat": 13.0012, "lng": 80.2565, "base_aqi": 70, "type": "Green Residential"},
            {"name": "T. Nagar", "lat": 13.0418, "lng": 80.2341, "base_aqi": 110, "type": "Commercial Hub"},
            {"name": "Ennore", "lat": 13.2161, "lng": 80.3247, "base_aqi": 175, "type": "Thermal Power/Chemicals"},
            {"name": "Anna Nagar", "lat": 13.0850, "lng": 80.2101, "base_aqi": 85, "type": "Residential"},
            {"name": "Velachery", "lat": 12.9815, "lng": 80.2180, "base_aqi": 90, "type": "High Development Area"}
        ],
        "point_sources": [
            {"id": "chn_ind_ennore_1", "name": "NCTPS Thermal Chimney A", "type": "Industry", "lat": 13.2190, "lng": 80.3210, "strength": 160},
            {"id": "chn_ind_ennore_2", "name": "Ennore Fertilizer Exhaust Stack", "type": "Industry", "lat": 13.2080, "lng": 80.3120, "strength": 130},
            {"id": "chn_const_metro", "name": "Chennai Metro Phase II T Nagar", "type": "Construction", "lat": 13.0380, "lng": 80.2300, "strength": 90},
            {"id": "chn_const_flyover", "name": "Velachery Flyover Extension Site", "type": "Construction", "lat": 12.9770, "lng": 80.2220, "strength": 80},
            {"id": "chn_traf_kathipara", "name": "Kathipara Cloverleaf Transit", "type": "Traffic", "lat": 13.0076, "lng": 80.2050, "strength": 110},
            {"id": "chn_traf_koyambedu", "name": "Koyambedu CMBT Exit Grid", "type": "Traffic", "lat": 13.0680, "lng": 80.2030, "strength": 120}
        ],
        "receptors": [
            {"name": "Fortis Malar Hospital Adyar", "type": "Hospital", "lat": 13.0110, "lng": 80.2520},
            {"name": "Padma Seshadri Bala Bhavan T Nagar", "type": "School", "lat": 13.0425, "lng": 80.2390},
            {"name": "Stanley Medical College Hospital", "type": "Hospital", "lat": 13.1060, "lng": 80.2810}
        ]
    }
}

# Distance calculation helper (Haversine formula in km)
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth's radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

# Generate realistic, dynamic weather parameters for a given city based on time of day
def get_simulated_weather(city_name, target_time=None):
    if target_time is None:
        target_time = datetime.now()
    
    # Use hour of the day and month to modulate parameters
    hour = target_time.hour
    
    # Establish base seeds depending on city (coastal cities like Mumbai/Chennai vs inland Delhi)
    if city_name == "Delhi":
        # Inland, extreme dry summer or cold winter
        base_temp = 32 if 3 <= target_time.month <= 10 else 14
        base_wind_speed = 6.0 # km/h, often stagnant
        base_humidity = 40 if 3 <= target_time.month <= 10 else 85
        wind_dir = 290 # Westerly / North-Westerly common
    elif city_name in ["Mumbai", "Chennai"]:
        # Coastal, humid, moderate temp, sea breeze
        base_temp = 28
        base_wind_speed = 14.0 # stronger sea breeze
        base_humidity = 78
        wind_dir = 240 if city_name == "Mumbai" else 90 # Southwesterly / Easterly
    else: # Bengaluru
        # Inland high altitude, pleasant, moderate wind
        base_temp = 24
        base_wind_speed = 10.0
        base_humidity = 60
        wind_dir = 260 # Westerly
    
    # Diurnal temperature cycle: peaks around 2 PM (14:00), lowest at 5 AM (05:00)
    temp_variation = 6 * math.sin(math.radians((hour - 8) * 15))
    temp = round(base_temp + temp_variation, 1)
    
    # Stagnant wind at night, breeze in the afternoon
    wind_variation = 3 * math.sin(math.radians((hour - 10) * 15))
    wind_speed = round(max(2.0, base_wind_speed + wind_variation), 1)
    
    # Shifts in wind direction (within +/- 30 degrees)
    wind_direction = int((wind_dir + 25 * math.sin(math.radians(hour * 15))) % 360)
    
    # Humidity is inversely proportional to temperature
    humidity_variation = 15 * math.sin(math.radians((hour - 20) * 15))
    humidity = int(max(10, min(100, base_humidity + humidity_variation)))
    
    # Inversion index: higher in early morning (04:00 - 08:00), traps pollution
    inversion_factor = 1.4 if 4 <= hour <= 8 else 0.9
    
    return {
        "temperature": temp,
        "wind_speed": wind_speed,
        "wind_direction": wind_direction,
        "humidity": humidity,
        "inversion_factor": inversion_factor,
        "timestamp": target_time.isoformat()
    }

# Gaussian Dispersion Simulator: Calculates point source contribution to a receptor point
def calculate_source_contribution(source_lat, source_lng, source_strength, target_lat, target_lng, weather):
    dist_km = haversine_distance(source_lat, source_lng, target_lat, target_lng)
    if dist_km < 0.05: # Caps extremely close proximity to avoid division by zero
        dist_km = 0.05
    
    wind_speed = weather["wind_speed"]
    wind_dir_deg = weather["wind_direction"]
    inversion = weather["inversion_factor"]
    
    # Angle of wind vector (standard math angles starting from East)
    # Meteorological wind direction is where the wind comes FROM.
    # So the wind blows TOWARDS: (wind_dir_deg + 180) % 360
    wind_towards_rad = math.radians((wind_dir_deg + 180) % 360)
    wind_dx = math.cos(wind_towards_rad)
    wind_dy = math.sin(wind_towards_rad)
    
    # Vector from source to target (approximate using simple lat/lng scale differences)
    # 1 deg lat is approx 111 km, 1 deg lng is approx 111 * cos(lat)
    target_dx_km = (target_lng - source_lng) * 111.0 * math.cos(math.radians((source_lat + target_lat) / 2))
    target_dy_km = (target_lat - source_lat) * 111.0
    
    # Calculate projection of source-to-receptor onto the wind vector (downwind distance)
    downwind_dist = target_dx_km * wind_dx + target_dy_km * wind_dy
    # Calculate perpendicular distance to the wind vector (crosswind distance)
    crosswind_dist = abs(-target_dx_km * wind_dy + target_dy_km * wind_dx)
    
    # Plume spreads as it goes downwind
    # dispersion coefficients sigma_y and sigma_z grow with downwind distance
    sigma_y = max(5.0, 0.15 * downwind_dist * 1000.0) # in meters
    sigma_z = max(3.0, 0.10 * downwind_dist * 1000.0) # in meters
    
    # If target is upwind (downwind_dist < 0), there is very minor backward diffusion
    if downwind_dist < 0:
        upwind_decay = math.exp(downwind_dist * 2.0) # extremely sharp drop
        contribution = (source_strength * 0.1 / (wind_speed * 0.5)) * math.exp(-(crosswind_dist * 1000) ** 2 / (2 * 100**2)) * upwind_decay
    else:
        # Gaussian plume formula along ground level:
        # C = (Q / (pi * u * sigma_y * sigma_z)) * exp(-y^2 / (2 * sigma_y^2)) * inversion
        contribution = (source_strength * 1000.0) / (math.pi * (wind_speed / 3.6) * sigma_y * sigma_z)
        crosswind_decay = math.exp(-((crosswind_dist * 1000) ** 2) / (2 * sigma_y ** 2))
        distance_decay = math.exp(-dist_km * 0.3) # general atmospheric fallout
        contribution = contribution * crosswind_decay * distance_decay * inversion
    
    return max(0.0, contribution * 1.5)

# Get live simulated details for a city, including calculated ward-level AQIs
def get_live_city_data(city_name, current_time=None, reports=None):
    if city_name not in CITY_PRESETS:
        return None
    
    if current_time is None:
        current_time = datetime.now()
        
    preset = CITY_PRESETS[city_name]
    weather = get_simulated_weather(city_name, current_time)
    
    # Diurnal multiplier for traffic
    # Peaks: 08:00 - 10:00 (1.6) and 17:00 - 20:00 (1.8)
    hour = current_time.hour
    traffic_mult = 1.0
    if 8 <= hour <= 10:
        traffic_mult = 1.5
    elif 17 <= hour <= 20:
        traffic_mult = 1.7
    elif 0 <= hour <= 5:
        traffic_mult = 0.3 # low overnight traffic
    
    # Calculate live parameters for each ward
    wards_live = []
    for ward in preset["wards"]:
        ward_lat = ward["lat"]
        ward_lng = ward["lng"]
        
        # Calculate contributions from point sources
        traffic_contrib = 0.0
        industry_contrib = 0.0
        construction_contrib = 0.0
        waste_burning_contrib = 0.0
        
        for ps in preset["point_sources"]:
            strength = ps["strength"]
            # Apply traffic diurnal factor
            if ps["type"] == "Traffic":
                strength *= traffic_mult
            
            contrib = calculate_source_contribution(ps["lat"], ps["lng"], strength, ward_lat, ward_lng, weather)
            
            if ps["type"] == "Traffic":
                traffic_contrib += contrib
            elif ps["type"] == "Industry":
                industry_contrib += contrib
            elif ps["type"] == "Construction":
                construction_contrib += contrib
        
        # Incorporate citizen-submitted reports (e.g. active waste burning or construction dust)
        # If there are active, unresolved reports in this city, they add local hotspots
        if reports:
            for rep in reports:
                # Only count reports matching this city and not resolved
                if rep.get("city") == city_name and rep.get("status") in ["Pending", "Dispatched"]:
                    rep_dist = haversine_distance(rep["lat"], rep["lng"], ward_lat, ward_lng)
                    if rep_dist < 2.0: # within 2km
                        report_strength = 75.0 if rep["category"] == "Waste Burning" else 50.0
                        # Decay over distance
                        rep_contrib = (report_strength / (rep_dist + 0.3)) * weather["inversion_factor"]
                        if rep["category"] == "Waste Burning":
                            waste_burning_contrib += rep_contrib
                        elif rep["category"] == "Construction Dust":
                            construction_contrib += rep_contrib
                        else:
                            traffic_contrib += rep_contrib # fallback category
        
        # Base background AQI modulated by meteorological parameters
        # High humidity traps PM2.5, low temperature limits dispersion
        weather_factor = (weather["humidity"] / 100.0) * 20.0 - (weather["temperature"] - 25.0) * 0.8
        
        total_aqi = int(ward["base_aqi"] + traffic_contrib + industry_contrib + construction_contrib + waste_burning_contrib + weather_factor)
        total_aqi = max(15, total_aqi) # Cleanest floor is 15
        
        # Add slight randomness (+/- 3 AQI points) to make it feel natural
        total_aqi += random.randint(-3, 3)
        
        # Cap AQI class categories
        if total_aqi <= 50:
            status = "Good"
        elif total_aqi <= 100:
            status = "Satisfactory"
        elif total_aqi <= 200:
            status = "Moderate"
        elif total_aqi <= 300:
            status = "Poor"
        elif total_aqi <= 400:
            status = "Very Poor"
        else:
            status = "Severe"
            
        # Compile source attribution percentages
        total_contrib = traffic_contrib + industry_contrib + construction_contrib + waste_burning_contrib + 15.0 # background
        
        # Distribute percentages
        attr_traffic = round((traffic_contrib + 5.0) / total_contrib * 100.0, 1)
        attr_industry = round((industry_contrib + 3.0) / total_contrib * 100.0, 1)
        attr_construction = round((construction_contrib + 2.0) / total_contrib * 100.0, 1)
        attr_waste = round((waste_burning_contrib + 1.0) / total_contrib * 100.0, 1)
        attr_bg = round(100.0 - (attr_traffic + attr_industry + attr_construction + attr_waste), 1)
        # Ensure sum equals 100
        if attr_bg < 0:
            attr_bg = 0.0
            
        wards_live.append({
            "name": ward["name"],
            "lat": ward_lat,
            "lng": ward_lng,
            "type": ward["type"],
            "aqi": total_aqi,
            "status": status,
            "pm25": int(total_aqi * 0.65), # typical ratio for Indian cities
            "pm10": int(total_aqi * 1.15),
            "no2": int(total_aqi * 0.18 + 5),
            "so2": int(total_aqi * 0.08 + 2),
            "source_attribution": {
                "Traffic": attr_traffic,
                "Industry": attr_industry,
                "Construction": attr_construction,
                "Waste Burning": attr_waste,
                "Background / Transboundary": attr_bg
            }
        })
        
    return {
        "city": city_name,
        "center": preset["center"],
        "weather": weather,
        "point_sources": preset["point_sources"],
        "receptors": preset["receptors"],
        "wards": wards_live
    }

# Generate 24-72h forecast and trends for a specific ward
def get_ward_forecast_data(city_name, ward_name, reports=None):
    if city_name not in CITY_PRESETS:
        return None
        
    preset = CITY_PRESETS[city_name]
    ward_found = next((w for w in preset["wards"] if w["name"].lower() == ward_name.lower()), None)
    if not ward_found:
        return None
        
    now = datetime.now()
    forecast_points = []
    
    # Generate predictions hourly for the next 24 hours, and then daily for +48h and +72h
    # In our simulation, we will forecast for:
    # +6h, +12h, +18h, +24h, +48h, +72h to build a clean chart
    intervals = [0, 6, 12, 18, 24, 48, 72]
    
    for hrs in intervals:
        future_time = now + timedelta(hours=hrs)
        # Simulate slight weather changes (wind dies down, shift direction)
        # To show actionable forecasts:
        # Suppose a stagnation event occurs at +24h (wind drops to 2km/h) which spikes AQI!
        simulated_city_data = get_live_city_data(city_name, future_time, reports)
        ward_live = next((w for w in simulated_city_data["wards"] if w["name"].lower() == ward_name.lower()), None)
        
        # At +24h, let's artificially simulate a calm wind stagnation incident to make the forecasting agent interesting!
        if hrs == 24:
            ward_live["aqi"] = int(ward_live["aqi"] * 1.35)
            # Re-adjust source percentages (industry and waste become dominant due to stagnation)
            ward_live["pm25"] = int(ward_live["aqi"] * 0.70)
            ward_live["pm10"] = int(ward_live["aqi"] * 1.20)
            
            # Recalculate categories
            aqi = ward_live["aqi"]
            if aqi <= 50: ward_live["status"] = "Good"
            elif aqi <= 100: ward_live["status"] = "Satisfactory"
            elif aqi <= 200: ward_live["status"] = "Moderate"
            elif aqi <= 300: ward_live["status"] = "Poor"
            elif aqi <= 400: ward_live["status"] = "Very Poor"
            else: ward_live["status"] = "Severe"
            
        forecast_points.append({
            "time_offset_hours": hrs,
            "timestamp": future_time.isoformat(),
            "time_label": f"+{hrs}h" if hrs > 0 else "Live",
            "aqi": ward_live["aqi"],
            "status": ward_live["status"],
            "weather": simulated_city_data["weather"],
            "source_attribution": ward_live["source_attribution"]
        })
        
    return {
        "city": city_name,
        "ward": ward_name,
        "type": ward_found["type"],
        "forecast": forecast_points
    }
