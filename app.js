const form = document.getElementById("estimate-form");
const totalCost = document.getElementById("total-cost");
const breakdownContainer = document.getElementById("breakdown");

const formatCurrency = (value) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

const getBaseRate = (stoneType) => {
  const rates = {
    gas: 42000,
    brick: 52000,
    ceramic: 48000,
    silicate: 45000,
  };
  return rates[stoneType] ?? 47000;
};

const getFoundationRate = (foundation) => {
  const rates = {
    strip: 8500,
    slab: 12000,
    pile: 9500,
  };
  return rates[foundation] ?? 10000;
};

const getRoofRate = (roof) => {
  const rates = {
    metal: 6500,
    soft: 7200,
    tile: 9800,
  };
  return rates[roof] ?? 7500;
};

const getEngineeringRate = (engineering) => {
  const rates = {
    basic: 9500,
    standard: 13500,
    premium: 18500,
  };
  return rates[engineering] ?? 13500;
};

const getFinishRate = (finish) => {
  const rates = {
    rough: 9000,
    pre: 14000,
    full: 22000,
  };
  return rates[finish] ?? 12000;
};

const renderBreakdown = (items) => {
  breakdownContainer.innerHTML = "";
  items.forEach(({ label, value }) => {
    const row = document.createElement("div");
    row.className = "breakdown-item";
    row.innerHTML = `<div>${label}</div><span>${formatCurrency(value)}</span>`;
    breakdownContainer.append(row);
  });
};

const calculateEstimate = (event) => {
  event?.preventDefault();

  const data = new FormData(form);
  const area = Number(data.get("area"));
  const floors = Number(data.get("floors"));
  const floorHeight = Number(data.get("floorHeight"));
  const wallThickness = Number(data.get("wallThickness"));
  const contingency = Number(data.get("contingency")) / 100;

  const baseRate = getBaseRate(data.get("stoneType"));
  const foundationRate = getFoundationRate(data.get("foundation"));
  const roofRate = getRoofRate(data.get("roof"));
  const engineeringRate = getEngineeringRate(data.get("engineering"));
  const finishRate = getFinishRate(data.get("finish"));

  const heightFactor = 1 + Math.max(0, floorHeight - 2.7) * 0.08;
  const thicknessFactor = 1 + Math.max(0, wallThickness - 400) / 400 * 0.15;
  const floorFactor = 1 + Math.max(0, floors - 1) * 0.06;

  const structuralCost = area * baseRate * heightFactor * thicknessFactor;
  const foundationCost = area * foundationRate;
  const roofCost = area * roofRate;
  const engineeringCost = area * engineeringRate * floorFactor;
  const finishCost = area * finishRate;
  const logisticsCost = area * 3200;

  const subtotal =
    structuralCost +
    foundationCost +
    roofCost +
    engineeringCost +
    finishCost +
    logisticsCost;
  const reserve = subtotal * contingency;
  const total = subtotal + reserve;

  totalCost.textContent = formatCurrency(total);

  renderBreakdown([
    { label: "Коробка дома и перекрытия", value: structuralCost },
    { label: "Фундамент", value: foundationCost },
    { label: "Кровельные работы", value: roofCost },
    { label: "Инженерные системы", value: engineeringCost },
    { label: "Отделка", value: finishCost },
    { label: "Логистика и спецтехника", value: logisticsCost },
    { label: `Резерв ${Math.round(contingency * 100)}%`, value: reserve },
  ]);
};

form.addEventListener("submit", calculateEstimate);
window.addEventListener("load", calculateEstimate);
