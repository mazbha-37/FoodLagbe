import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useGetOrderByIdQuery } from './customerApi';
import Button from '../../components/ui/Button';

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const [show, setShow] = useState(false);

  const { data } = useGetOrderByIdQuery(orderId, { skip: !orderId });
  const order = data?.order;

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className={`text-center transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex justify-center mb-6">
          <CheckCircle size={80} className="text-[#60B246]" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-[#1C1C1C] mb-2">Order Placed Successfully!</h1>
        {order?.orderNumber && (
          <p className="text-[#7E808C] text-sm mb-6">
            Order <span className="font-semibold text-[#1C1C1C]">#{order.orderNumber}</span> has been placed
          </p>
        )}
        <p className="text-sm text-[#7E808C] mb-8 max-w-xs mx-auto">
          We've received your order and the restaurant will start preparing it soon.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {orderId && (
            <Button onClick={() => navigate(`/orders/${orderId}`)}>
              Track Your Order
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
