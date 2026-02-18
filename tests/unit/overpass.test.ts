import { mapTagsToCategory } from "@/lib/overpass";

describe("overpass category mapping", () => {
  it("maps water amenity", () => {
    expect(mapTagsToCategory({ amenity: "drinking_water" })).toBe("water");
    expect(mapTagsToCategory({ amenity: "fountain" })).toBe("water");
  });

  it("maps bar/cafe amenities", () => {
    expect(mapTagsToCategory({ amenity: "bar" })).toBe("bar");
    expect(mapTagsToCategory({ amenity: "cafe" })).toBe("bar");
  });

  it("maps food shops", () => {
    expect(mapTagsToCategory({ shop: "supermarket" })).toBe("food_shop");
    expect(mapTagsToCategory({ shop: "bakery" })).toBe("food_shop");
  });

  it("returns null for unsupported tags", () => {
    expect(mapTagsToCategory({ tourism: "museum" })).toBeNull();
  });
});
