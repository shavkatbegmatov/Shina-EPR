import axios from 'axios';
import { API_BASE_URL } from '../../config/constants';

/**
 * Ommaviy (auth talab qilmaydigan) storefront endpointlari uchun klient:
 * katalog, facet'lar, ommaviy sozlamalar.
 *
 * Ataylab ERP klienti (`api/axios`) EMAS: u har so'rovga xodim tokenini qo'shar
 * va 401 da xaridorni `/admin/login` ga uloqtirar edi — eskirgan xodim tokeni
 * qolgan brauzerda oddiy katalog ko'rish ERP login sahifasiga olib borardi.
 */
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default publicApi;
