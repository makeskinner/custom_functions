function calculateCategoryValue(category, price) {
  const categories = ["Category 1", "Category 2", "Category 3", "Category 4"];
  const categoryIndex = categories.indexOf(category);
  return price * (categoryIndex + 1);
}