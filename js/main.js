import { getUser, getContractors } from './api.js';
import { initMap, renderPins, updateMap } from './map.js';
import { renderTable, updateTable } from './list.js';
import { initModal, setModalUser } from './modal.js';
import { initValidation } from './validation.js';
import { formatCurrency } from './utils.js';

// State
let state = {
  user: null,
  contractors: [],
  filter: {
    type: 'buy', // 'buy' or 'sell'
    view: 'list', // 'list' or 'map'
    verifiedOnly: false
  }
};

// DOM Elements
const userCryptoBalance = document.getElementById('user-crypto-balance');
const userFiatBalance = document.getElementById('user-fiat-balance');
const userProfileName = document.querySelector('.user-profile__name span');
const buySellTabs = document.querySelector('.tabs--toggle-buy-sell');
const listMapTabs = document.querySelector('.tabs--toggle-list-map');
const verifiedCheckbox = document.getElementById('checked-users');
const usersListContainer = document.querySelector('.users-list');
const mapContainer = document.querySelector('.map').parentElement;
const noResultsContainer = document.querySelector('.container--lightbackground');

// Render User Profile
const renderUserProfile = (user) => {
  if (!user) return;

  const keksBalance = user.balances.find(b => b.currency === 'KEKS')?.amount || 0;
  const rubBalance = user.balances.find(b => b.currency === 'RUB')?.amount || 0;

  userCryptoBalance.textContent = keksBalance;
  userFiatBalance.textContent = formatCurrency(rubBalance);
  userProfileName.textContent = user.userName;
};

// Filter Logic
const filterContractors = () => {
  const { type, verifiedOnly } = state.filter;

  // If user wants to BUY, we show SELLERS. If user wants to SELL, we show BUYERS.
  // API returns "status": "seller" or "buyer".

  const targetStatus = type === 'buy' ? 'seller' : 'buyer';

  let filtered = state.contractors.filter(c => c.status === targetStatus);

  if (verifiedOnly) {
    filtered = filtered.filter(c => c.isVerified);
  }

  return filtered;
};

const updateView = () => {
  const filteredContractors = filterContractors();

  if (state.filter.view === 'list') {
    usersListContainer.style.display = 'block';
    mapContainer.style.display = 'none';

    if (filteredContractors.length === 0) {
      noResultsContainer.style.display = 'block';
      usersListContainer.style.display = 'none'; // Hide table if no results
    } else {
      noResultsContainer.style.display = 'none';
      updateTable(filteredContractors);
    }

  } else {
    usersListContainer.style.display = 'none';
    noResultsContainer.style.display = 'none'; // Map handles empty state internally (empty map)
    mapContainer.style.display = 'block';

    // For map, we only show sellers who accept cash
    const mapContractors = filteredContractors.filter(c => {
      if (c.status !== 'seller') return false;
      return c.paymentMethods.some(pm => pm.provider === 'Cash in person');
    });

    updateMap(mapContractors);
  }
};

// Event Listeners
const initEventListeners = () => {
  // Buy/Sell Tabs
  buySellTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tabs__control');
    if (!btn) return;

    buySellTabs.querySelectorAll('.tabs__control').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    state.filter.type = btn.textContent.trim() === 'Купить' ? 'buy' : 'sell';
    updateView();
  });

  // List/Map Tabs
  listMapTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tabs__control');
    if (!btn) return;

    listMapTabs.querySelectorAll('.tabs__control').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    state.filter.view = btn.textContent.trim() === 'Карта' ? 'map' : 'list';
    updateView();
  });

  // Verified Checkbox
  verifiedCheckbox.addEventListener('change', (e) => {
    state.filter.verifiedOnly = e.target.checked;
    updateView();
  });
};

const init = async () => {
  try {
    const [userData, contractorsData] = await Promise.all([
      getUser(),
      getContractors()
    ]);

    state.user = userData;
    state.contractors = contractorsData;

    // Pass user to modal module
    setModalUser(state.user);

    renderUserProfile(state.user);
    initEventListeners();

    // Initial Render
    updateView();

    // Initialize other modules
    initMap();
    initModal();
    initValidation();

  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.querySelector('.container').style.display = 'none'; // Hide main container?
    // Show error message container
    const errorContainer = document.querySelector('.message').closest('.container');
    if (errorContainer) errorContainer.style.display = 'block';
  }
};

init();
