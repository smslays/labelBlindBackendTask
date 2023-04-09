const puppeteer = require("puppeteer");
const MongoClient = require("mongodb").MongoClient;

// URL of the Amazon page to scrape
const url = "https://www.amazon.com/s?k=food";

// MongoDB connection string
const mongoURI = "mongodb://127.0.0.1:27017/fooddb";

(async () => {
  // Launch a new browser instance
  const browser = await puppeteer.launch();

  // Open a new page in the browser
  const page = await browser.newPage();

  // Navigate to the Amazon page
  await page.goto(url);

  // Wait for the Amazon logo to appear on the page
  await page.waitForSelector("#nav-logo-sprites", { timeout: 30000 });

  // Wait for the product list to appear on the page
  await page.waitForSelector(".s-result-list", { timeout: 30000 });

  // Get all the product listings on the page
  const products = await page.$$(".s-result-list .s-result-item");

  // Connect to the MongoDB database
  const client = await MongoClient.connect(mongoURI);
  const db = client.db();

  // Loop through each product listing and scrape the data
  for (const product of products) {
    try {
      // Extract the product name
      const nameElement = await product.$(".s-image");
      const name = nameElement
        ? await nameElement.evaluate((el) => el.getAttribute("alt"))
        : null;

      // Extract the net weight
      const weightElement = await product.$(".s-item__weight");
      const weight = weightElement
        ? await weightElement.evaluate((el) => el.textContent.trim())
        : null;

      // Extract the price
      const priceElement = await product.$(".a-price-whole");
      const price = priceElement
        ? await priceElement.evaluate((el) => el.textContent.trim())
        : null;

      // Extract the list of ingredients
      const ingredientsElement = await product.$(".a-text-bold");
      const ingredients = ingredientsElement
        ? await ingredientsElement.evaluate((el) => el.textContent.trim())
        : null;

      // Extract the nutrition information
      const nutritionElement = await product.$(
        ".a-size-base.a-link-normal.s-no-hover"
      );
      const nutrition = nutritionElement
        ? await nutritionElement.evaluate((el) => el.textContent.trim())
        : null;

      // Extract the "About this item" description
      const aboutElement = await product.$(".a-section.a-text-center");
      const about = aboutElement
        ? await aboutElement.evaluate((el) => el.textContent.trim())
        : null;

      // Extract the product image
      const imageElement = await product.$(".s-image img");
      const image = imageElement
        ? await imageElement.evaluate((el) => el.getAttribute("src"))
        : null;

      // Extract the "Vegetarian" or "Non Vegetarian" text
      const vegetarianElement = await product.$(".a-icon-prime-pantry");
      const vegetarian = vegetarianElement
        ? await vegetarianElement.evaluate((el) =>
            el.getAttribute("aria-label")
          )
        : null;

      // Store the data in the MongoDB database
      await db.collection("products").insertOne({
        name,
        weight,
        price,
        ingredients,
        nutrition,
        about,
        image,
        vegetarian,
      });
    } catch (err) {
      console.log("Error extracting product data:", err);
    }
  }

  // Close the browser and the database connection
  await browser.close();
  await client.close();

  console.log("Scraping Complete...");
})();
