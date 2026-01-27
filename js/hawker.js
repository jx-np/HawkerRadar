const regionSelect = document.getElementById("region");

regionSelect.addEventListener("change", () => {
  const selectedRegion = regionSelect.value;
  
  const filtered = hawkerCentres.filter(hc => {
    return !selectedRegion || hc.region.toLowerCase() === selectedRegion;
  });

  // re-render cards
  hcGrid.innerHTML = "";
  filtered.forEach(hc => {
    hcGrid.innerHTML += `
      <div class="hc-card">
        <div class="hc-image"></div>
        <div class="hc-info">
            <strong>${hc.name}</strong>
            <em>${hc.cuisine}</em>
            <span>${hc.region}</span>
        </div>
      </div>
    `;
  });
});
