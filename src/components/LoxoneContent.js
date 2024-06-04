import React, { Component, useState, useEffect } from "react";

import {
  Link,
  useLocation,
  useParams,
} from 'react-router-dom';
import { Row, Col } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { getConfig } from "../config";

import contentData from "../utils/contentData";
import loxone_1 from "../assets/loxone_1.png";
import loxone_2 from "../assets/loxone_2.png";
import loxone_3 from "../assets/loxone_3.png";
import loxone_4 from "../assets/loxone_4.png";
import meric from "../assets/meric.png";
import meric_vody from "../assets/meric_vody.png";
import monitor_toku_energie from "../assets/monitor_toku_energie.png";
import spotreba from "../assets/spotreba.png";
import spotreba_vody from "../assets/spotreba_vody.png";
import teplota from "../assets/teplota.png";
import vlhkost from "../assets/vlhkost.png";

const LoxoneContent = () => {
  const [token, setToken] = useState();
  const [homeName, setHomeName] = useState();
  const {homeId} = useParams();
  const { apiOrigin, audience } = getConfig();
  const {
    getAccessTokenSilently,
    loginWithPopup,
    getAccessTokenWithPopup,
    user
  } = useAuth0();

  const fetchHome = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/1/homes/${homeId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json();
      if (responseData.length == 0) {
        setToken("hodnota_vašeho_loxone_tokenu");
        setHomeName("");
        return;
      }

      console.log(responseData);
      setToken(responseData[0].loxone_token);
      console.log(homeName);
      setHomeName(responseData[0].name);

    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchHome();
  });

  return (
    <div className="next-steps my-5">
      <h1 className="my-5 text-center" id="konfigurace">Konfigurace Loxone {homeName ? (<>pro dům: {homeName}</>) : (<></>)}</h1>
        <p>
          Nejprve je potřeba v sekci <Link to={{pathname: `/homes`}}>Moje Domy</Link> přidat dům a získat <i>Loxone token</i>.
          Dalším krokem je vytvoření Loxone loggeru v aplikace Loxone Config.
        </p>

      <h2 className="my-5 text-center" id="vytvoreni-loggeru">Vytvoření Loxone loggeru</h2>
        <p>
          V aplikaci Loxone Config v sekci <i>Periferie</i> najděte Váš Miniserver a v něm vyberte <i>Zprávy</i>.
        </p>
      <img className="rounded mx-auto d-block" src={loxone_1} width="240" />
        <p>
          Vytvořte nový Logger stisknutím tlačítka Logger v panelu nástrojů v horní části aplikace Loxone Config.
          Dojde k vytvoření nového Loggeru. Logger můžete libovolně pojmenovat.
        </p>
        <img className="rounded mx-auto d-block" src={loxone_2} width="800" />
        <p>
          Nastavte adresu Loggeru v jeho Vlastnostech na <i>/dev/udp/domecek.online/2222</i>.
        </p>
        <img className="rounded mx-auto d-block" src={loxone_3} width="480" />


      <h2 className="my-5 text-center"  id="vyber-dat">Výběr dat zasílaných na Domeček.online</h2>
        <p>
          Loxone posílá na Domeček.online pouze data z objektů, kterým nastavíte Logger vytvořený v předchozí sekci tohoto dokumentu. Můžete si tedy vybrat, jaká data chcete s Domeček.online sdílet.
        </p>
        <p>
          Nejprve vyberte objekt, jehož data chcete posílat na Domeček.online a v jeho Vlastnostech najděte sekci Logger.
        </p>

        <p>
          Jako Logger vyberte Logger vytvořený v první části tohoto dokumentu. Pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí" nastavte následovně:
        </p>
        <code>
        &lt;v.1&gt;;{token}
        </code>
        <br/><br/>
        <img className="rounded mx-auto d-block" src={loxone_4} width="480" />
        <p>
          Po uložení Loxone konfigurace na Miniserver začne Miniserver posílat data z tohoto objektu na Domeček.online.
        </p>

        <h2 className="my-5 text-center"  id="pojmenovani">Pojmenování zasílaných dat</h2>
        <p>
          Standardně Loxone Miniserver použije pro logování objektu jeho jméno. To může být nepraktické, protože často má více objektů v projektu stejné jméno (například "Teplota", "Vlhkost", "Spotřeba").
        </p>
        <p>
          Pro účely logování lze tedy objekt přejmenovat nastavením pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí" následovně:
        </p>
        <code>
        Nové jméno:&lt;v.1&gt;;{token}
        </code>

        <h2 className="my-5 text-center"  id="standardizovana-jmena">Standardizovaná jména dat</h2>
        <p>
          Domeček.online musí vědět jaký je význam dat, která mu z Vašeho Loxone Miniserveru zasíláte. Tato kapitola obsahuje standardizovaná jména dat. Tato jména je nutné používat aby grafy fungovaly správně.
        </p>

          <h3 className="my-5 text-center"  id="spotreba">"Spotřeba ..."</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Pro měření aktuální spotřeby zařízení ve Wattech.
                    <img className="rounded mx-auto d-block" src={spotreba} width="800" /></li>
                    <li>Pokud používáte blok Monitor Toku Energie, tak všechna zařízení nastavená v tomto bloku budou své spotřeby odesílat automaticky a není potřeba pro ně "Spotřeba ..." nastavovat. Více v <a href="#monitor-toku-energie">Monitor toku energie</a>.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Spotřeba Pračka:&lt;v.1&gt;;{token}</code></li>
                    <li><code>Spotřeba Myčka:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="spotreba-vody">"Spotřeba vody"</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Pro měření aktuální spotřeby vody celého domu v litrech za hodinu.
                    <img className="rounded mx-auto d-block" src={spotreba_vody} width="800" /></li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Spotřeba vody:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="meric">"Měřič ..."</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Odečet měřiče spotřeby elektrické energie v kWh. Většinou se nastavuje u bloku Virtuální Status připojeného na Výstup "Mr" měřiče,
                        nebo na Výstup MrD Měřiče s úložištěm.
                    <img className="rounded mx-auto d-block" src={meric} width="800" />
                    </li>
                    <li>Pokud používáte blok Monitor Toku Energie, tak všechna zařízení nastavená v tomto bloku budou své odečty odesílat automaticky a není potřeba pro ně "Měřič ..." nastavovat. Více v <a href="#monitor-toku-energie">Monitor toku energie</a>.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Měřič Pračka:&lt;v.1&gt;;{token}</code></li>
                    <li><code>Měřič Myčka:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="meric-nabijeni">"Měřič nabíjení ..."</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Odečet měřiče nabíjení elektrické energie v kWh. Většinou se nastavuje u bloku Virtuální Status připojeného na Výstup "MrC" měřiče
                        s úložištěm..
                    <img className="rounded mx-auto d-block" src={meric} width="800" />
                    </li>
                    <li>Pokud používáte blok Monitor Toku Energie, tak všechna zařízení nastavená v tomto bloku budou své odečty odesílat automaticky a není potřeba pro ně "Měřič nabíjení ..." nastavovat. Více v <a href="#monitor-toku-energie">Monitor toku energie</a>.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Měřič Nabíjení Baterie:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="meric-vody">"Měřič vody"</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Odečet měřiče spotřeby vody celého domu v litrech. Většinou se nastavuje u bloku Virtuální Status připojeného na Výstup "Mr" měřiče.
                    <img className="rounded mx-auto d-block" src={meric_vody} width="800" />
                    </li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Měřič vody:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="teplota">"Teplota ..."</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Měření teploty místnosti v stupních Celsia.
                    <img className="rounded mx-auto d-block" src={teplota} width="800" /></li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Teplota Předsíň:&lt;v.1&gt;;{token}</code></li>
                    <li><code>Teplota Garáž:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="teplota-venku">"Teplota venku"</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Měření venkovní teploty v stupních Celsia.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Teplota venku:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="teplota-bojler">"Teplota bojler"</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Měření teploty vody v bojleru v stupních Celsia.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Teplota bojleru:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="vlhkost">"Vlhkost ..."</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Měření relativní vlhkosti v místnosti v procentech.
                    <img className="rounded mx-auto d-block" src={vlhkost} width="800" /></li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Vlhkost Předsíň:&lt;v.1&gt;;{token}</code></li>
                    <li><code>Vlhkost Garáž:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="vlhkost-venku">"Vlhkost venku"</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Měření venkovní relativní vlhkosti v procentech.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Vlhkost venku:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="ventilator">"Ventilátor ..."</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Informace o zapnutí nebo vypnutí ventilátoru v místnosti.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Ventilátor Koupelna:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="baterie">"Baterie"</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Nabití baterie fotovoltaické elektrárny v procentech.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Baterie:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="auto-baterie">"Auto baterie ..."</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Nabití baterie auta v procentech.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Auto baterie Opel Mokka:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>


          <h3 className="my-5 text-center"  id="auto-dojezd">"Auto dojezd ..."</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Aktuální dojezd auta v km.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Auto tachometr Opel Mokka:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="auto-tachometr">"Auto tachometr ..."</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Aktuální hodnota tachometru auta v km.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Auto tachometr Opel Mokka:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="destova-nadrz">"Dešťová nádrž"</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Zaplněnost nádrže na deštovou vodu v procentech.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Dešťová nádrž:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>

          <h3 className="my-5 text-center"  id="monitor-toku-energie">"Monitor toku energie"</h3>
            <p>
              <ul>
                <li><b>Použití:</b>
                  <ul>
                    <li>Měření spotřeby všech zařízení registrovaných v bloku "Monitor toku energie".</li>
                    <li>Pro všechna zařízení registrovaná v Monitoru toku energie zašle Loxone Miniserver automaticky jejich <a href="#spotreba">Spotřebu</a> a  <a href="#meric">Měřič</a>. Není tak potřeba konfigurovat každé zařízení samostatně.</li>
                  </ul>
                </li>
                <li><b>Příklady nastavení pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí":</b>
                  <ul>
                    <li><code>Monitor toku energie:&lt;v.1&gt;;{token}</code></li>
                  </ul>
                </li>
              </ul>
            </p>
            </div>
  );
}

export default LoxoneContent;
