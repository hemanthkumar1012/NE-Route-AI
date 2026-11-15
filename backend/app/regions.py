"""Global region packs for the worldwide demonstration network.

Each region contributes an illustrative (synthetic, non-authoritative) node
graph, administrative districts, weather features, logistics hubs and demo
shipments. North East India remains the reference region; the packs below
extend the same platform to humanitarian-logistics corridors worldwide.

All coordinates are [longitude, latitude]. Distances, ETAs, risk scores and
stock levels are synthetic demo values — not real operational data.
"""

# ---------------------------------------------------------------------------
# East Africa relief corridor (Mombasa port -> inland distribution)
# ---------------------------------------------------------------------------
EAST_AFRICA = {
    "key": "EAF",
    "name": "East Africa Relief Corridor",
    "nodes": {
        "Mombasa": [39.6682, -4.0435],
        "Nairobi": [36.8219, -1.2921],
        "Eldoret": [35.2698, 0.5143],
        "Kampala": [32.5825, 0.3476],
        "Juba": [31.5825, 4.8594],
        "Arusha": [36.6830, -3.3869],
        "Dodoma": [35.7516, -6.1630],
    },
    "edges": [
        ("Mombasa", "Nairobi", "Mombasa–Nairobi A109 Corridor", 485, 540, 30, 6),
        ("Nairobi", "Eldoret", "Nairobi–Eldoret Northern Corridor", 310, 380, 44, 14),
        ("Eldoret", "Kampala", "Eldoret–Kampala Trans-Africa Corridor", 450, 560, 52, 12),
        ("Kampala", "Juba", "Kampala–Juba Nile Corridor", 640, 900, 82, 10),
        ("Nairobi", "Arusha", "Nairobi–Arusha Namanga Corridor", 270, 330, 38, 11),
        ("Arusha", "Dodoma", "Arusha–Dodoma Central Corridor", 420, 520, 47, 13),
    ],
    "districts": [
        ("Mombasa County", "Kenya", 90, [39.6682, -4.0435]),
        ("Nairobi County", "Kenya", 88, [36.8219, -1.2921]),
        ("Uasin Gishu", "Kenya", 74, [35.2698, 0.5143]),
        ("Kampala District", "Uganda", 82, [32.5825, 0.3476]),
        ("Central Equatoria", "South Sudan", 48, [31.5825, 4.8594]),
        ("Arusha Region", "Tanzania", 76, [36.6830, -3.3869]),
    ],
    "weather": [("Central Equatoria", 118, 74), ("Uasin Gishu", 64, 41)],
    "facilities": [
        ("MBA-PORT", "Mombasa Port Logistics Hub", "Mombasa", "REGIONAL_HUB", [39.6682, -4.0435], 15000),
        ("JUB-RELIEF", "Juba Relief Distribution Hub", "Juba", "RELIEF_HUB", [31.5825, 4.8594], 5200),
    ],
    "shipments": [
        ("EAF-MED-310", "MEDICINE", "CRITICAL", "Mombasa", "Juba", "IN_TRANSIT", 1180, "EAF-TRK-101", 1080),
        ("EAF-FOOD-215", "FOOD", "HIGH", "Nairobi", "Kampala", "IN_TRANSIT", 620, "EAF-TRK-102", 780),
    ],
    "vehicles": [
        ("EAF-TRK-101", "Demo Driver EA-1", "IN_TRANSIT", 52, "Eldoret", "EAF-MED-310"),
        ("EAF-TRK-102", "Demo Driver EA-2", "IN_TRANSIT", 47, "Nairobi", "EAF-FOOD-215"),
    ],
}

# ---------------------------------------------------------------------------
# Southeast Asia monsoon corridor (Mekong region)
# ---------------------------------------------------------------------------
SOUTHEAST_ASIA = {
    "key": "SEA",
    "name": "Southeast Asia Monsoon Corridor",
    "nodes": {
        "Bangkok": [100.5018, 13.7563],
        "Phnom Penh": [104.9282, 11.5564],
        "Ho Chi Minh City": [106.6297, 10.8231],
        "Vientiane": [102.6331, 17.9757],
        "Hanoi": [105.8342, 21.0278],
        "Yangon": [96.1951, 16.8661],
    },
    "edges": [
        ("Bangkok", "Phnom Penh", "Bangkok–Phnom Penh AH1 Corridor", 660, 780, 36, 4),
        ("Phnom Penh", "Ho Chi Minh City", "Phnom Penh–HCMC Mekong Delta Corridor", 230, 300, 58, 3),
        ("Bangkok", "Vientiane", "Bangkok–Vientiane Friendship Corridor", 640, 760, 33, 8),
        ("Vientiane", "Hanoi", "Vientiane–Hanoi Annamite Corridor", 760, 1020, 72, 21),
        ("Bangkok", "Yangon", "Bangkok–Yangon Myawaddy Corridor", 850, 1150, 68, 19),
    ],
    "districts": [
        ("Bangkok Metropolis", "Thailand", 92, [100.5018, 13.7563]),
        ("Phnom Penh Capital", "Cambodia", 80, [104.9282, 11.5564]),
        ("Ho Chi Minh City", "Vietnam", 87, [106.6297, 10.8231]),
        ("Vientiane Prefecture", "Laos", 71, [102.6331, 17.9757]),
        ("Hanoi Capital Region", "Vietnam", 85, [105.8342, 21.0278]),
        ("Yangon Region", "Myanmar", 62, [96.1951, 16.8661]),
    ],
    "weather": [("Yangon Region", 134, 92), ("Ho Chi Minh City", 88, 57)],
    "facilities": [
        ("BKK-REGIONAL", "Bangkok Regional Logistics Hub", "Bangkok", "REGIONAL_HUB", [100.5018, 13.7563], 14000),
        ("HCM-MED", "Ho Chi Minh Medical Distribution Centre", "Ho Chi Minh City", "MEDICAL_DEPOT", [106.6297, 10.8231], 5600),
    ],
    "shipments": [
        ("SEA-MED-410", "MEDICINE", "CRITICAL", "Bangkok", "Hanoi", "IN_TRANSIT", 1440, "SEA-TRK-201", 1320),
        ("SEA-REL-133", "RELIEF", "HIGH", "Bangkok", "Yangon", "DELAYED", 1260, "SEA-TRK-202", 1080),
    ],
    "vehicles": [
        ("SEA-TRK-201", "Demo Driver SE-1", "IN_TRANSIT", 44, "Vientiane", "SEA-MED-410"),
        ("SEA-TRK-202", "Demo Driver SE-2", "DELAYED", 0, "Bangkok", "SEA-REL-133"),
    ],
}

# ---------------------------------------------------------------------------
# Andes high-altitude corridor (South America)
# ---------------------------------------------------------------------------
ANDES = {
    "key": "AND",
    "name": "Andes High-Altitude Corridor",
    "nodes": {
        "Lima": [-77.0428, -12.0464],
        "Huancayo": [-75.2049, -12.0651],
        "Cusco": [-71.9675, -13.5320],
        "Arequipa": [-71.5375, -16.4090],
        "La Paz": [-68.1193, -16.4897],
    },
    "edges": [
        ("Lima", "Huancayo", "Lima–Huancayo Carretera Central", 305, 420, 66, 30),
        ("Huancayo", "Cusco", "Huancayo–Cusco Sierra Corridor", 590, 820, 74, 27),
        ("Lima", "Arequipa", "Lima–Arequipa Panamericana Sur", 1010, 1130, 28, 7),
        ("Arequipa", "Cusco", "Arequipa–Cusco Altiplano Corridor", 480, 620, 55, 23),
        ("Arequipa", "La Paz", "Arequipa–La Paz Desaguadero Corridor", 610, 790, 61, 18),
    ],
    "districts": [
        ("Lima Province", "Peru", 91, [-77.0428, -12.0464]),
        ("Junín Region", "Peru", 69, [-75.2049, -12.0651]),
        ("Cusco Region", "Peru", 73, [-71.9675, -13.5320]),
        ("Arequipa Region", "Peru", 79, [-71.5375, -16.4090]),
        ("La Paz Department", "Bolivia", 70, [-68.1193, -16.4897]),
    ],
    "weather": [("Junín Region", 72, 58), ("Cusco Region", 81, 66)],
    "facilities": [
        ("LIM-PORT", "Lima Callao Logistics Hub", "Lima", "REGIONAL_HUB", [-77.0428, -12.0464], 13000),
        ("CUS-RELIEF", "Cusco Highland Relief Hub", "Cusco", "RELIEF_HUB", [-71.9675, -13.5320], 4800),
    ],
    "shipments": [
        ("AND-MED-512", "MEDICINE", "CRITICAL", "Lima", "Cusco", "IN_TRANSIT", 860, "AND-TRK-301", 780),
    ],
    "vehicles": [
        ("AND-TRK-301", "Demo Driver AN-1", "IN_TRANSIT", 34, "Huancayo", "AND-MED-512"),
    ],
}

GLOBAL_REGIONS = [EAST_AFRICA, SOUTHEAST_ASIA, ANDES]

# ---------------------------------------------------------------------------
# Multimodal inter-region links: humanitarian air bridges and sea lanes.
# These connect the regional road graphs into one routable world network.
# (node_a, node_b, name, mode, distance_km, eta_minutes, risk_score)
# Mode becomes the segment terrain: AIR_CORRIDOR or SEA_LANE. ETAs include
# illustrative handling/transfer time; all values are synthetic.
# ---------------------------------------------------------------------------
INTER_REGION_LINKS = [
    ("Guwahati", "Bangkok", "Guwahati–Bangkok Humanitarian Air Bridge", "AIR", 1880, 300, 12),
    ("Bangkok", "Nairobi", "Bangkok–Nairobi Strategic Air Bridge", "AIR", 7300, 660, 15),
    ("Nairobi", "Lima", "Nairobi–Lima Transoceanic Air Bridge", "AIR", 12800, 1080, 18),
    ("Mombasa", "Ho Chi Minh City", "Mombasa–HCMC Indian Ocean Sea Lane", "SEA", 7900, 12960, 22),
    ("Lima", "Mombasa", "Callao–Mombasa Transoceanic Sea Lane", "SEA", 17000, 28800, 25),
]

DEFAULT_STOCK = {
    "REGIONAL_HUB": {"MEDICAL_KITS": (700, 160, "kits"), "FOOD_PACKS": (2100, 450, "packs"), "RELIEF_KITS": (1100, 240, "kits"), "ROAD_REPAIR_KITS": (380, 85, "kits"), "FUEL_LITERS": (16000, 3200, "liters")},
    "RELIEF_HUB": {"MEDICAL_KITS": (300, 95, "kits"), "FOOD_PACKS": (1100, 230, "packs"), "RELIEF_KITS": (650, 150, "kits"), "ROAD_REPAIR_KITS": (190, 55, "kits"), "FUEL_LITERS": (7000, 1400, "liters")},
    "MEDICAL_DEPOT": {"MEDICAL_KITS": (480, 130, "kits"), "FOOD_PACKS": (550, 150, "packs"), "RELIEF_KITS": (380, 100, "kits"), "ROAD_REPAIR_KITS": (90, 40, "kits"), "FUEL_LITERS": (3600, 950, "liters")},
    "SUPPLY_DEPOT": {"MEDICAL_KITS": (240, 85, "kits"), "FOOD_PACKS": (850, 210, "packs"), "RELIEF_KITS": (520, 130, "kits"), "ROAD_REPAIR_KITS": (170, 50, "kits"), "FUEL_LITERS": (6000, 1300, "liters")},
}
