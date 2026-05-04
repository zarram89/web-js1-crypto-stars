import { formatCurrency } from './utils.js';
import { openModal } from './modal.js';

let map = null;
let markers = [];

const mapContainer = document.querySelector('.map');
const balloonTemplate = document.querySelector('#map-baloon__template').content.querySelector('.user-card');

const createBalloonContent = (contractor) => {
  const balloon = balloonTemplate.cloneNode(true);

  const nameSpan = balloon.querySelector('.user-card__user-name span');
  nameSpan.textContent = contractor.userName;

  if (!contractor.isVerified) {
    balloon.querySelector('.user-card__user-name svg').remove();
  }

  balloon.querySelector('.user-card__cash-data').textContent = contractor.balance.currency;

  // Find "Курс" and "Лимит" items by label text or order?
  // Template structure: p.user-card__cash-item > span.label + span.data
  const items = balloon.querySelectorAll('.user-card__cash-item');
  items[1].querySelector('.user-card__cash-data').textContent = `${formatCurrency(contractor.exchangeRate)} ₽`;
  items[2].querySelector('.user-card__cash-data').textContent =
    `${formatCurrency(contractor.minAmount)} ₽ - ${formatCurrency(contractor.balance.amount * contractor.exchangeRate)} ₽`;

  const badgesList = balloon.querySelector('.user-card__badges-list');
  badgesList.innerHTML = '';
  if (contractor.paymentMethods) {
    contractor.paymentMethods.forEach(method => {
      const li = document.createElement('li');
      li.classList.add('user-card__badges-item', 'badge');
      li.textContent = method.provider;
      badgesList.appendChild(li);
    });
  }

  const exchangeBtn = balloon.querySelector('.user-card__change-btn');
  exchangeBtn.dataset.id = contractor.id;
  exchangeBtn.addEventListener('click', () => {
    openModal(contractor);
  });

  return balloon;
};

export const initMap = () => {
  if (map) return;

  // Default coords: lat: 59.92749, lng: 30.31127
  map = L.map(mapContainer).setView([59.92749, 30.31127], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
};

export const renderPins = (contractors) => {
  if (!map) return;

  // Clear existing markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  const pinIcon = L.icon({
    iconUrl: 'img/pin.svg',
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46]
  });

  const verifiedPinIcon = L.icon({
    iconUrl: 'img/pin-verified.svg',
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46]
  });

  contractors.forEach(contractor => {
    if (!contractor.coords) return;

    const icon = contractor.isVerified ? verifiedPinIcon : pinIcon;
    const marker = L.marker([contractor.coords.lat, contractor.coords.lng], { icon });

    marker.bindPopup(createBalloonContent(contractor));
    marker.addTo(map);
    markers.push(marker);
  });
};

export const updateMap = (contractors) => {
  renderPins(contractors);
}
