import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {

      const updateCart = [...cart];
      const productExists = updateCart.find(product => product.id === productId);
      const stock = await api.get(`/stock/${productId}`)
        .then(response => response.data);

      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExists) {

        productExists.amount = amount;
      }
      else {

        const product = await api.get(`products/${productId}`)
          .then(response => response.data);

        const newProduct = {
          ...product,
          amount: 1
        }
        updateCart.push(newProduct);
      }

      setCart(updateCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updateCart));
    }
    catch {
      toast.error("Erro na adição do produto");
    }
  }

  const removeProduct = (productId: number) => {
    try {

      const updatedCart = [...cart];

      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {

        updatedCart.splice(productIndex, 1);

        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart))
      }
      else {
        throw Error();
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      const stock = await api.get(`stock/${productId}`)
        .then(response => response.data);

      if (productExists) {

        if (amount <= stock.amount) {

          productExists.amount = amount;

          setCart(updatedCart);

          localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart))
        }
        else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
      else {
        throw Error();
      }
    } catch {

      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
