import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Calendar, TrendingUp } from 'lucide-react';
import { Sale, Product, StockMovement, StockMovementType } from '../types';

const ReportsDashboard = ({ 
  sales, 
  products, 
  stockMovements 
}: { 
  sales: Sale[]; 
  products: Product[]; 
  stockMovements: StockMovement[] 
}) => {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const getDateRange = () => {
    const selected = new Date(selectedDate);
    let startDate = new Date(selected);
    let endDate = new Date(selected);

    if (reportType === 'daily') {
      endDate = new Date(startDate);
    } else if (reportType === 'weekly') {
      const day = startDate.getDay();
      startDate.setDate(startDate.getDate() - day);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
    } else if (reportType === 'monthly') {
      startDate = new Date(selected.getFullYear(), selected.getMonth(), 1);
      endDate = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
    }

    return { startDate, endDate };
  };

  const reportData = useMemo(() => {
    const { startDate, endDate } = getDateRange();

    const periodSales = sales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= startDate && saleDate <= endDate;
    });

    const periodMovements = stockMovements.filter(m => {
      const movDate = new Date(m.timestamp);
      return movDate >= startDate && movDate <= endDate;
    });

    const totalRevenue = periodSales.reduce((acc, s) => acc + s.totalPrice, 0);
    const totalSales = periodSales.length;
    const totalStockIn = periodMovements
      .filter(m => m.type === StockMovementType.IN)
      .reduce((acc, m) => acc + m.quantity, 0);
    const totalStockOut = periodMovements
      .filter(m => m.type === StockMovementType.OUT)
      .reduce((acc, m) => acc + m.quantity, 0);

    // Top products
    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    periodSales.forEach(sale => {
      const existing = productSalesMap.get(sale.productId) || { 
        name: sale.productName, 
        quantity: 0, 
        revenue: 0 
      };
      productSalesMap.set(sale.productId, {
        name: existing.name,
        quantity: existing.quantity + sale.quantity,
        revenue: existing.revenue + sale.totalPrice
      });
    });

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const lowStockProducts = products.filter(p => p.stock <= p.minStockThreshold);

    // Daily sales chart data
    const dailySalesData = new Map<string, number>();
    periodSales.forEach(sale => {
      const date = new Date(sale.date).toLocaleDateString();
      dailySalesData.set(date, (dailySalesData.get(date) || 0) + sale.totalPrice);
    });

    const chartData = Array.from(dailySalesData.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totalRevenue,
      totalSales,
      totalStockIn,
      totalStockOut,
      topProducts,
      lowStockProducts,
      chartData
    };
  }, [sales, stockMovements, reportType, selectedDate, products]);

  const generatePDF = () => {
    const { startDate, endDate } = getDateRange();
    const dateRange = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
    
    // Simple PDF generation - in production, use a library like jsPDF
    const content = `
VEMPAT INVENTORY REPORT
${reportType.toUpperCase()} REPORT
Period: ${dateRange}

=== SUMMARY ===
Total Revenue: ₦${reportData.totalRevenue.toLocaleString()}
Total Sales: ${reportData.totalSales}
Stock In: ${reportData.totalStockIn} units
Stock Out: ${reportData.totalStockOut} units

=== TOP 5 PRODUCTS ===
${reportData.topProducts
  .map((p, i) => `${i + 1}. ${p.name}: ${p.quantity} units (₦${p.revenue.toLocaleString()})`)
  .join('\n')}

=== LOW STOCK ALERTS ===
${reportData.lowStockProducts.length === 0 
  ? 'All products well-stocked'
  : reportData.lowStockProducts
      .map(p => `${p.brand}: ${p.stock}/${p.minStockThreshold} units`)
      .join('\n')}

Report Generated: ${new Date().toLocaleString()}
    `;

    // Create a blob and download
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `report-${reportType}-${new Date().getTime()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
        <button
          onClick={generatePDF}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {reportType === 'daily' ? 'Date' : reportType === 'weekly' ? 'Week Start' : 'Month'}
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
          >
            Today
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
          <p className="text-slate-600 text-sm font-medium mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-slate-900">₦{(reportData.totalRevenue / 1000).toFixed(1)}K</p>
          <p className="text-xs text-slate-500 mt-2">Period total</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
          <p className="text-slate-600 text-sm font-medium mb-2">Total Sales</p>
          <p className="text-3xl font-bold text-slate-900">{reportData.totalSales}</p>
          <p className="text-xs text-slate-500 mt-2">Transactions</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
          <p className="text-slate-600 text-sm font-medium mb-2">Stock In</p>
          <p className="text-3xl font-bold text-green-600">{reportData.totalStockIn}</p>
          <p className="text-xs text-slate-500 mt-2">Units received</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
          <p className="text-slate-600 text-sm font-medium mb-2">Stock Out</p>
          <p className="text-3xl font-bold text-red-600">{reportData.totalStockOut}</p>
          <p className="text-xs text-slate-500 mt-2">Units used/sold</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Revenue Trend</h3>
          {reportData.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#0ea5e9" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p>No sales data for this period</p>
            </div>
          )}
        </div>

        {/* Top Products Pie */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Top Products</h3>
          {reportData.topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.topProducts}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {reportData.topProducts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p>No sales data</p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Top Products Table */}
      {reportData.topProducts.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top Products Detail
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Product</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Units Sold</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {reportData.topProducts.map((product, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">{product.name}</td>
                    <td className="text-right py-3 px-4">{product.quantity}</td>
                    <td className="text-right py-3 px-4 font-semibold text-sky-600">
                      ₦{product.revenue.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      {((product.revenue / reportData.totalRevenue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low Stock Alerts */}
      {reportData.lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="font-bold text-amber-900 mb-4">⚠️ Low Stock Alerts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reportData.lowStockProducts.map(product => (
              <div key={product.id} className="bg-white rounded p-3 border border-amber-100">
                <p className="font-medium text-slate-900">{product.brand}</p>
                <p className="text-sm text-amber-700">
                  {product.stock} / {product.minStockThreshold} units
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsDashboard;
