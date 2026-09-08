import speech_recognition as sr
import pyttsx3
import requests
import json
import re

# 1. Initialize Text-to-Speech Engine
engine = pyttsx3.init()
engine.setProperty('rate', 160)    # Natural speech speed
voices = engine.getProperty('voices')
# Set an English voice (usually voices[0] or voices[1] on Windows)
if len(voices) > 1:
    engine.setProperty('voice', voices[1].id)

def speak(text: str):
    print(f"\n[WeatherGPT]: {text}")
    engine.say(text)
    engine.runAndWait()

# 2. Live Meteorological Telemetry Fetcher (Open-Meteo API)
def fetch_weather(city="Greater Noida"):
    try:
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=en&format=json"
        geo_res = requests.get(geo_url, timeout=5).json()
        if "results" not in geo_res or not geo_res["results"]:
            return None
        
        lat = geo_res["results"][0]["latitude"]
        lon = geo_res["results"][0]["longitude"]
        resolved_name = geo_res["results"][0]["name"]
        
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,surface_pressure"
            "&timezone=auto"
        )
        data = requests.get(weather_url, timeout=5).json()["current"]
        return {
            "location": resolved_name,
            "temp": round(data["temperature_2m"]),
            "humidity": round(data["relative_humidity_2m"]),
            "rain": round(data["precipitation"], 1),
            "wind": round(data["wind_speed_10m"], 1),
            "pressure": round(data["surface_pressure"], 1)
        }
    except Exception as e:
        print(f"Fetch error: {e}")
        return None

# 3. Decision Support Rule Engine (Sector Advisories)
def generate_advisory(telemetry, query):
    q = query.lower()
    t = telemetry
    
    # Base weather summary
    summary = f"In {t['location']}, current temperature is {t['temp']} degrees Celsius, humidity is {t['humidity']} percent, and wind speed is {t['wind']} kilometers per hour. "
    
    # Agricultural intent (crops, spray, farming, pesticide)
    if any(k in q for k in ["spray", "crop", "farm", "fertilizer", "pesticide", "agriculture"]):
        if t["rain"] > 0 or t["humidity"] > 80:
            return summary + "Agricultural Alert: High moisture levels detected. Postpone chemical and pesticide spraying to avoid nutrient runoff."
        elif t["wind"] > 20:
            return summary + "Agricultural Advisory: Wind speed exceeds 20 kilometers per hour. Delay spraying to prevent chemical drift."
        else:
            return summary + "Agricultural Advisory: Weather conditions are optimal for irrigation, sowing, and fertilizer application."
            
    # Marine / Coastal intent (sea, boat, fishermen, wave)
    if any(k in q for k in ["marine", "sea", "boat", "fish", "wave", "ocean"]):
        if t["wind"] > 40 or t["pressure"] < 995:
            return summary + "Severe Marine Warning: Cyclonic squall risk. Fishermen are strictly advised not to venture into deep waters."
        elif t["wind"] > 25:
            return summary + "Marine Caution: Moderate to rough sea conditions. Small motorized crafts should remain near the shore."
        else:
            return summary + "Marine Advisory: Calm sea conditions. Safe for coastal transit and regular fishing operations."

    # General / Severe alert fallback
    if t["rain"] > 10:
        return summary + "Severe Weather Notice: Heavy rainfall active. Flash flood alert in low-lying underpasses."
    
    return summary + "Conditions are normal across the district."

# 4. Speech Recognition Listener
def listen(recognizer, source):
    print("\n[Listening] Speak your weather or advisory question...")
    try:
        recognizer.adjust_for_ambient_noise(source, duration=0.8)
        audio = recognizer.listen(source, timeout=6, phrase_time_limit=8)
        print("[Processing] Transcribing speech...")
        query = recognizer.recognize_google(audio, language="en-IN")
        print(f"[User]: {query}")
        return query
    except sr.WaitTimeoutError:
        return None
    except sr.UnknownValueError:
        print("[Notice] Could not recognize clear speech.")
        return None
    except sr.RequestError:
        speak("Speech recognition network error.")
        return None

# 5. Extract City Name from Speech (Defaults to Greater Noida)
def detect_city(query):
    # Regex checks for "in <city>" or "for <city>"
    match = re.search(r'\b(?:in|for|at)\s+([A-Za-z\s]+)', query, re.IGNORECASE)
    if match:
        city = match.group(1).strip()
        return city
    return "Greater Noida"

# 6. Main Interactive Loop
if __name__ == "__main__":
    speak("WeatherGPT voice assistant is online. You can ask for weather forecasts, crop spray advisories, or marine warnings.")
    
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        while True:
            query = listen(recognizer, source)
            
            if not query:
                continue
                
            if any(stop_word in query.lower() for stop_word in ["exit", "quit", "stop", "bye"]):
                speak("Shutting down WeatherGPT voice core. Have a safe day.")
                break
                
            city = detect_city(query)
            telemetry = fetch_weather(city)
            
            if telemetry:
                advisory = generate_advisory(telemetry, query)
                speak(advisory)
            else:
                speak(f"Sorry, I could not retrieve meteorological data for {city}.")