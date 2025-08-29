import ProductManagement from './ProductList';

function ProductList() {
  // ...
  return (
    <>
      <ProductManagement onProductAdded={loadProducts} />
      {/* existing table rendering */}
    </>
  );
}
