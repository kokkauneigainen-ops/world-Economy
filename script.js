// ===== グローバル変数 =====
let pagename = [];
let maprows = [];
let countryall = [];
let selectedPage = null;
let panZoomInstance = null;

// 建国機能用の変数
let isCreatingCountry = false;
let newCountryInfo = { name: '', color: '' };
let selectedPathsForNewCountry = [];

// ===== データ取得と初期設定 =====
fetch("GASのURL") // ※必ずご自身のGASのURLに書き換えてください
  .then(res => res.ok ? res.json() : Promise.reject(new Error('Network response was not ok.')))
  .then(data => {
    console.log("取得したデータ:", data);
    
    // ★★★ SVGの入れ子構造をプログラムで修正 ★★★
    // 外側のSVG(#wrapper)を削除し、内側のSVG(#map)を直接の操作対象にする
    const mapContainer = document.getElementById('map-container');
    const innerSvg = document.getElementById('map'); // 地図本体のSVG
    const wrapperSvg = document.getElementById('wrapper'); // 外側のSVG

    if (mapContainer && innerSvg && wrapperSvg) {
        mapContainer.removeChild(wrapperSvg); // コンテナから外側SVGを一旦削除
        mapContainer.appendChild(innerSvg);   // コンテナに内側SVGだけを再配置
        console.log("SVGの構造を動的に修正しました。");
    } else {
        console.error("SVGの構造修正に失敗しました。HTML内のSVGのID(wrapper, map)を確認してください。");
        alert("マップの読み込みに失敗しました。SVGの構造を確認してください。");
        return;
    }
    // ★★★ 構造の修正ここまで ★★★

    const map = data["MapData"];
    const country = data["CountryData"];

    pagename = map[0];
    maprows = map.slice(1);
    countryall = country;

    setupUI();
    initialMapRender();

    // ★★★ ドラックとズーム機能の初期化 (対象を #map に変更) ★★★
    panZoomInstance = svgPanZoom('#map', { // ターゲットを #map に変更
      zoomEnabled: true,
      panEnabled: true,
      controlIconsEnabled: true,
      fit: true,
      center: true,
      minZoom: 0.5,
      maxZoom: 10,
    });
    
    window.addEventListener('resize', () => {
        panZoomInstance.resize();
        panZoomInstance.fit();
        panZoomInstance.center();
    });

  })
  .catch(error => {
    console.error('データの取得に失敗しました:', error);
    alert('データの取得に失敗しました。ページを再読み込みしてください。');
  });

function createPageButton(buttonName) {
  const btn = document.createElement("button");
  btn.innerText = buttonName;
  btn.onclick = function() {
    selectedPage = buttonName;
    alert(`「${buttonName}」タブを選択しました。`);
    document.querySelectorAll('#button-container button').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
  };
  const container = document.getElementById("button-container");
  if (container) container.appendChild(btn);
}

function setupUI() {
    pagename.forEach(name => createPageButton(name));
    
    // ★クリックイベントの対象を #map 内のpathに限定
    document.querySelectorAll("#map path").forEach(path => {
        path.addEventListener("click", handleMapClick);
    });

    const createCountryBtn = document.getElementById('create-country-btn');
    if (createCountryBtn) createCountryBtn.addEventListener('click', handleCreateCountryBtnClick);
    
    const saveDataBtn = document.getElementById('save-data-btn');
    if (saveDataBtn) saveDataBtn.addEventListener('click', saveData);
}

// handleMapClick, handleCreateCountryBtnClick, displayPathInfo, getGradientColor, getRandomColor, saveData, initialMapRender
// 以下の関数は以前の回答から変更ありません
// ... (ここから下の関数は変更なし) ...

function handleMapClick(event) {
    const path = event.currentTarget;
    const datapath = path.id;
    const rowIndex = maprows.findIndex(row => row[0] === datapath);

    if (rowIndex === -1) {
        document.getElementById("infoBox").innerHTML = `<p>${datapath}のデータは見つかりませんでした。</p>`;
        return;
    }
    displayPathInfo(maprows[rowIndex]);

    if (isCreatingCountry) {
        const countryColIndex = pagename.indexOf("国");
        if (countryColIndex !== -1 && maprows[rowIndex][countryColIndex]) {
            alert("このマスは既に「" + maprows[rowIndex][countryColIndex] + "」の領土です。");
            return;
        }
        if (selectedPathsForNewCountry.includes(datapath)) {
            selectedPathsForNewCountry = selectedPathsForNewCountry.filter(id => id !== datapath);
            path.style.stroke = '';
            path.style.strokeWidth = '';
        } else {
            selectedPathsForNewCountry.push(datapath);
            path.style.stroke = 'yellow';
            path.style.strokeWidth = '3px';
        }
        return;
    }

    if (!selectedPage) {
        alert("更新したい項目（タブ）をクリックして選択してください。");
        return;
    }

    const colIndex = pagename.indexOf(selectedPage);
    if (colIndex === -1) return;

    if (selectedPage === "国") {
        const inputCountryName = prompt("このマスに設定する国名を入力してください。");
        if (!inputCountryName) return;

        const countryInfo = countryall.find(c => c[0] === inputCountryName);
        if (countryInfo) {
            path.style.fill = countryInfo[1];
            maprows[rowIndex][colIndex] = inputCountryName;
        } else {
            alert(`国「${inputCountryName}」は存在しません。`);
            return;
        }
    } else {
        const inputValue = prompt("1から100までの数値を入力してください。", "50");
        if (inputValue === null || inputValue === "") return;
        const numValue = parseInt(inputValue, 10);
        if (isNaN(numValue) || numValue < 1 || numValue > 100) {
            alert("1から100の範囲で数値を入力してください。");
            return;
        }
        path.style.fill = getGradientColor(numValue);
        maprows[rowIndex][colIndex] = numValue;
    }
    displayPathInfo(maprows[rowIndex]);
}

function handleCreateCountryBtnClick() {
    const btn = document.getElementById('create-country-btn');
    isCreatingCountry = !isCreatingCountry;

    if (isCreatingCountry) {
        const countryName = prompt("建国する国の名前を入力してください:");
        if (!countryName) {
            isCreatingCountry = false;
            return;
        }
        if (countryall.some(row => row[0] === countryName)) {
            alert("その国名は既に使用されています。");
            isCreatingCountry = false;
            return;
        }
        newCountryInfo.name = countryName;
        newCountryInfo.color = getRandomColor();
        selectedPathsForNewCountry = [];
        btn.innerText = '選択を完了して建国する';
        btn.style.backgroundColor = '#ffc107';
        alert(`「${countryName}」を建国します。マップ上の空きマスを選択してください。`);
    } else {
        if (selectedPathsForNewCountry.length > 0) {
            const countryColIndex = pagename.indexOf("国");
            if (countryColIndex === -1) {
                alert("エラー:「国」データ列が見つかりません。");
            } else {
                 selectedPathsForNewCountry.forEach(pathId => {
                    const rowIndex = maprows.findIndex(row => row[0] === pathId);
                    if (rowIndex !== -1) {
                        maprows[rowIndex][countryColIndex] = newCountryInfo.name;
                        const pathElement = document.getElementById(pathId);
                        if (pathElement) {
                            pathElement.style.fill = newCountryInfo.color;
                            pathElement.style.stroke = '';
                            pathElement.style.strokeWidth = '';
                        }
                    }
                });
                countryall.push([newCountryInfo.name, newCountryInfo.color]);
                alert(`「${newCountryInfo.name}」が建国されました！`);
            }
        }
        btn.innerText = '建国';
        btn.style.backgroundColor = '';
        selectedPathsForNewCountry = [];
    }
}

function displayPathInfo(pathData) {
    const infoBox = document.getElementById("infoBox");
    if (infoBox) {
        let listItems = pagename.map((header, index) => {
            const value = pathData[index] || '（データなし）';
            return `<li><strong>${header}:</strong> ${value}</li>`;
        }).join('');
        infoBox.innerHTML = `<h3>${pathData[0]}の情報</h3><ul>${listItems}</ul>`;
    }
}

function getGradientColor(value) {
    const hue = 120 - (value - 1) * (120 / 99);
    return `hsl(${hue}, 100%, 50%)`;
}

function getRandomColor() {
    return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

async function saveData() {
  if(!confirm("現在の変更をサーバーに保存しますか？")) return;
  
  const mapDataToSave = [pagename, ...maprows];
  const countryDataToSave = countryall;
  
  try {
    const response = await fetch("GASのURL", { // ※必ずご自身のGASのURLに書き換えてください
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MapData: mapDataToSave, CountryData: countryDataToSave }),
    });
    if (!response.ok) throw new Error('サーバーへの送信に失敗しました。');
    const result = await response.json();
    console.log("保存成功:", result);
    alert("データを保存しました。");
  } catch (error) {
    console.error('保存エラー:', error);
    alert('データの保存に失敗しました。');
  }
}

function initialMapRender() {
    maprows.forEach(row => {
        const pathId = row[0];
        if (!pathId) return;
        const path = document.getElementById(pathId);
        if (!path) return;

        for (let i = 1; i < row.length; i++) {
            const cellValue = row[i];
            const tabName = pagename[i];
            if (cellValue) {
                if (tabName === "国") {
                    const userRow = countryall.find(c => c[0] === cellValue);
                    if (userRow) path.style.fill = userRow[1];
                } else {
                    const numValue = parseInt(cellValue, 10);
                    if (!isNaN(numValue)) path.style.fill = getGradientColor(numValue);
                }
            }
        }
    });
}
