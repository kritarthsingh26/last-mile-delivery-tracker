import assert from "assert";
import { getPincodeCoords, calculateDistance, detectZoneByPincode, calculateDeliveryCharges } from "../src/lib/logistics";
import prisma from "../src/lib/prisma";

async function runTests() {
  console.log("=== RUNNING LOGISTICS ENGINE INTEGRATION TESTS ===");

  try {
    // Test 1: Coordinates generator
    console.log("Running Test 1: Geolocation Coordinates...");
    const delhiCoords = getPincodeCoords("110001");
    assert.strictEqual(delhiCoords.lat, 28.6139);
    assert.strictEqual(delhiCoords.lng, 77.2090);
    
    const randomCoords = getPincodeCoords("999999");
    assert.ok(randomCoords.lat >= 20.0 && randomCoords.lat <= 30.0);
    console.log("✅ Test 1 Passed: Geolocation verified.");

    // Test 2: Haversine distance formula
    console.log("Running Test 2: Haversine Distance...");
    // Distance between Delhi and Mumbai should be roughly 1100-1200 km
    const delhiToMumbai = calculateDistance(28.6139, 77.2090, 18.9220, 72.8347);
    assert.ok(delhiToMumbai > 1100 && delhiToMumbai < 1200);
    
    // Distance to self should be 0
    const selfDist = calculateDistance(28.6139, 77.2090, 28.6139, 77.2090);
    assert.strictEqual(selfDist, 0);
    console.log("✅ Test 2 Passed: Haversine distance verified.");

    // Test 3: Zone detection
    console.log("Running Test 3: Zone Pincode Mapping...");
    const zoneForDelhi = await detectZoneByPincode("110002");
    assert.ok(zoneForDelhi !== null);
    assert.strictEqual(zoneForDelhi.name, "Zone A");
    
    const zoneForMumbai = await detectZoneByPincode("400003");
    assert.ok(zoneForMumbai !== null);
    assert.strictEqual(zoneForMumbai.name, "Zone B");
    
    const invalidZone = await detectZoneByPincode("999999");
    assert.strictEqual(invalidZone, null);
    console.log("✅ Test 3 Passed: Zone mapping verified.");

    // Test 4: Volumetric & Rate engine calculation
    console.log("Running Test 4: Pricing Engine (Volumetric weight & COD surcharge)...");
    // Volumetric weight: (30 * 20 * 15) / 5000 = 1.8 kg
    // Actual weight is 1.0 kg -> Billings weight should be 1.8 kg
    // Order Segment: B2C, Payment: PREPAID
    // Route: Delhi (110001) to Mumbai (400001) -> Inter-zone rate (Rs. 150/kg)
    // Charge = 1.8 * 150 = Rs. 270.0
    const chargeInfo1 = await calculateDeliveryCharges({
      length: 30,
      width: 20,
      height: 15,
      actualWeight: 1.0,
      orderType: "B2C",
      paymentType: "PREPAID",
      pickupPincode: "110001",
      dropPincode: "400001",
    });

    assert.strictEqual(chargeInfo1.volumetricWeight, 1.8);
    assert.strictEqual(chargeInfo1.chargeableWeight, 1.8);
    assert.strictEqual(chargeInfo1.isIntraZone, false);
    assert.strictEqual(chargeInfo1.baseCharge, 270.0);
    assert.strictEqual(chargeInfo1.codSurcharge, 0.0);
    assert.strictEqual(chargeInfo1.totalCharge, 270.0);

    // Test 5: COD Surcharge and Intra-zone rate
    // Route: Delhi (110001) to Delhi (110002) -> Intra-zone rate (Rs. 60/kg for B2C)
    // Weight: 3.0 kg actual vs 1.8 kg volumetric -> Bill weight = 3.0 kg
    // Charge = 3.0 * 60 + 40 (COD surcharge) = Rs. 220.0
    const chargeInfo2 = await calculateDeliveryCharges({
      length: 30,
      width: 20,
      height: 15,
      actualWeight: 3.0,
      orderType: "B2C",
      paymentType: "COD",
      pickupPincode: "110001",
      dropPincode: "110002",
    });

    assert.strictEqual(chargeInfo2.chargeableWeight, 3.0);
    assert.strictEqual(chargeInfo2.isIntraZone, true);
    assert.strictEqual(chargeInfo2.baseCharge, 180.0);
    assert.strictEqual(chargeInfo2.codSurcharge, 40.0);
    assert.strictEqual(chargeInfo2.totalCharge, 220.0);
    console.log("✅ Test 4 & 5 Passed: Pricing and surcharges verified.");

    console.log("\n🎉 ALL LOGISTICS TESTS COMPLETED SUCCESSFULLY! 🎉");
  } catch (error) {
    console.error("❌ A test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
