const fs = require('fs');

// List of makes that typically require premium fuel
const premiumMakes = [
  'BMW', 'MERCEDES', 'AUDI', 'JAGUAR', 'LEXUS', 'ROLLS-ROYCE', 'BENTLEY',
  'MASERATI', 'LAMBORGHINI', 'FERRARI', 'PORSCHE', 'ASTON MARTIN',
  'TESLA', 'BUGATTI', 'MCLAREN', 'INFINITI', 'ACURA'
];

// Read vehicles.json
const data = JSON.parse(fs.readFileSync('./public/data/vehicles.json', 'utf8'));

// Add fuelType to each vehicle
const updatedData = data.map(vehicle => ({
  ...vehicle,
  fuelType: premiumMakes.includes(vehicle.make.toUpperCase()) ? 'premium' : 'regular'
}));

// Write back
fs.writeFileSync('./public/data/vehicles.json', JSON.stringify(updatedData, null, 2));

console.log(`Updated ${updatedData.length} vehicles with fuel type information`);
