import React, { Component } from "react";

import { Row, Col } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import contentData from "../utils/contentData";
import loxone_1 from "../assets/loxone_1.png";
import loxone_2 from "../assets/loxone_2.png";
import loxone_3 from "../assets/loxone_3.png";
import loxone_4 from "../assets/loxone_4.png";

class LoxoneContent extends Component {
  render() {
    return (
      <div className="next-steps my-5">
        <h1 className="my-5 text-center">Konfigurace Loxone</h1>
          <p>
            Nejprve je potřeba v sekci <a href="/homes">Moje Domy</a> přidat dům a získat <i>Loxone token</i>.
            Dalším krokem je vytvoření Loxone loggeru v aplikace Loxone Config.
          </p>
        <h3 className="my-5 text-center">Vytvoření Loxone loggeru</h3>
          <p>
            V aplikaci Loxone Config v sekci <i>Periferie</i> najděte Váš Miniserver a v něm vyberte <i>Zprávy</i>.
          </p>
        <img className="rounded mx-auto d-block" src={loxone_1} width="240" />
          <p>
            Vytvořte nový Logger stisknutím tlačítka Logger v panelu nástrojů v horní části aplikace Loxone Config. Dojde k vytvoření nového Loggeru. Logger můžete libovolně pojmenovat.
          </p>
          <img className="rounded mx-auto d-block" src={loxone_2} width="800" />
          <p>
            Nastavte adresu Loggeru v jeho Vlastnostech na <i>/dev/udp/89.221.219.92/2222</i>.
          </p>
        <h3 className="my-5 text-center">Výběr dat zasílaných na Domeček.online</h3>
          <p>
            Loxone posílá na Domeček.online pouze data z objektů, kterým nastavíte Logger vytvořený v předchozí sekci tohoto dokumentu. Můžete si tedy vybrat, jaká data chcete s Domeček.online sdílet.
          </p>
          <p>
            Nejprve vyberte objekt, jehož data chcete posílat na Domeček.online a v jeho Vlastnostech najděte sekci Logger.
          </p>
          <img className="rounded mx-auto d-block" src={loxone_3} width="480" />
          <p>
            Jako Logger vyberte Logger vytvořený v první části tohoto dokumentu. Pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí" nastavte následovně:
          </p>
          <code>
          &lt;v.1&gt;;hodnota_vašeho_loxone_tokenu
          </code>
          <br/><br/>
          <img className="rounded mx-auto d-block" src={loxone_4} width="480" />
          <p>
            Po uložení Loxone konfigurace na Miniserver začne Miniserver posílat data z tohoto objektu na Domeček.online.
          </p>

          <p>
            Standardně Loxone Miniserver použije pro logování objektu jeho jméno. To může být nepraktické, protože často má více objektů v projektu stejné jméno (například "Teplota", "Vlhkost", "Spotřeba").
          </p>
          <p>
            Pro účely logování lze tedy objekt přejmenovat nastavením pole "Zpráva při zapnutí/změně analogové hodnoty" a "Zpráva při vypnutí" následovně:
          </p>
          <code>
          Nové jméno:&lt;v.1&gt;;hodnota_vašeho_loxone_tokenu
          </code>

      </div>
    );
  }
}

export default LoxoneContent;
