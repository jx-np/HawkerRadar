import { addHawkerCentre } from '../js/firebase/wrapper.js';

const hawkerCentres = {
    "101": { "HCName": "Maxwell Food Centre", "HCAddress": "1 Kadayanallur St", "OperatorID": 1, "PriceRange": "$$", "Region": "Central", "ImageURL": "https://image2url.com/r2/default/images/1770114949002-15726699-204b-4473-bb42-f64f498e1dc1.jpg" },
    "102": { "HCName": "Chinatown Complex", "HCAddress": "335 Smith St", "OperatorID": 2, "PriceRange": "$$", "Region": "Central", "ImageURL": "https://image2url.com/r2/default/images/1770114985169-aaba1d6a-8758-4ff5-98a2-5c57221ddafc.jpg" },
    "103": { "HCName": "Amoy Street FC", "HCAddress": "7 Maxwell Rd", "OperatorID": 3, "PriceRange": "$$", "Region": "Central", "ImageURL": "https://image2url.com/r2/default/images/1770115000703-9a3fd524-a07a-4143-b12b-a5540314a21f.jpg" },
    "104": { "HCName": "Tekka Centre", "HCAddress": "665 Buffalo Rd", "OperatorID": 4, "PriceRange": "$", "Region": "North", "ImageURL": "https://image2url.com/r2/default/images/1770115068131-d2d8c6ad-9c7e-4989-bf75-082de1612f75.blob" },
    "105": { "HCName": "Old Airport Rd FC", "HCAddress": "51 Old Airport Rd", "OperatorID": 5, "PriceRange": "$$", "Region": "East", "ImageURL": "https://image2url.com/r2/default/images/1770115088222-08dea82f-1d6e-4736-b8e1-2c01f69aa9cf.jpg" },
    "106": { "HCName": "Tiong Bahru Market", "HCAddress": "30 Seng Poh Rd", "OperatorID": 6, "PriceRange": "$$", "Region": "Central", "ImageURL": "https://image2url.com/r2/default/images/1770115112188-0e77b345-af91-4ce2-89e9-8446af6a7a25.webp" },
    "107": { "HCName": "Bedok 85", "HCAddress": "85 Bedok North St 4", "OperatorID": 7, "PriceRange": "$", "Region": "East", "ImageURL": "https://image2url.com/r2/default/images/1770115128281-a3ff4978-ec7f-4199-bee9-32f5fbbde09b.jpg" },
    "108": { "HCName": "Newton FC", "HCAddress": "500 Clemenceau Ave", "OperatorID": 8, "PriceRange": "$$$", "Region": "Central", "ImageURL": "https://image2url.com/r2/default/images/1770115143704-b7d1d0d9-0459-4f32-99d0-05117a091b79.jpg" },
    "109": { "HCName": "Lau Pa Sat", "HCAddress": "18 Raffles Quay", "OperatorID": 9, "PriceRange": "$$$", "Region": "Central", "ImageURL": "https://image2url.com/r2/default/images/1770115157821-6d2b6bb2-ce39-4992-859d-94f6bfbe0ca9.jpeg" },
    "110": { "HCName": "Golden Mile FC", "HCAddress": "505 Beach Rd", "OperatorID": 10, "PriceRange": "$$", "Region": "Central", "ImageURL": "https://image2url.com/r2/default/images/1770115167815-7f8f1641-9221-46fb-ba74-a9d369bc2c92.jpg" },
    "111": { "HCName": "Whampoa Market & FC", "HCAddress": "90 Whampoa Drive", "OperatorID": 11, "PriceRange": "$", "Region": "Central", "ImageURL": "https://image2url.com/r2/default/images/1770207225610-06d08f39-426c-486d-98a0-5389203aa4a5.jpg" },
    "112": { "HCName": "Yishun Park Hawker Centre", "HCAddress": "51 Yishun Ave 11", "OperatorID": 12, "PriceRange": "$", "Region": "North", "ImageURL": "https://image2url.com/r2/default/images/1770207237549-3b36cfe7-139a-495a-8db1-63f8c6369c85.jpeg" }
};

async function updateAllCentres() {
    for (const [id, centre] of Object.entries(hawkerCentres)) {
        const success = await addHawkerCentre(
            parseInt(id),
            centre.HCName,
            centre.HCAddress,
            centre.OperatorID,
            centre.PriceRange,
            centre.Region,
            centre.ImageURL
        );
        console.log(`Updated ${centre.HCName}:`, success);
    }
}

updateAllCentres();
