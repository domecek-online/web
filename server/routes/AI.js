const OpenAI = require("openai");
const {influx_query, run_cmd} = require("../utils.js");
const fs = require('node:fs');
const apiConfig = require("../../api_config.json");

const openai = new OpenAI({apiKey:apiConfig.openai_apikey});

async function get_measurements(bucket, list_only) {
  flux_query = `import "influxdata/influxdb/schema"\nschema.measurements(bucket: "${bucket}")`;
  var measurements = await influx_query(flux_query);
  m_description = ""
  for (measurement of measurements) {
    var name = measurement["_value"];
    if (list_only.length != 0 && !list_only.includes(name)) {
      continue;
    }
    fields = name.split(" ")
    if (fields[0] == "Měřič") {
      if (fields[1] == "Dům") {
        m_description += `- "${name}" containing time series of energy meter values consumed by whole house.\n`
      }
      else if (fields[1] == "FVE") {
        m_description += `- "${name}" containing time series of energy meter values for energy produced by solar panels.\n`
      }
      else if (fields[1] == "Grid") {
        m_description += `- "${name}" containing time series of energy meter values for energy consumed from grid by whole house.\n`
      }
      else if (fields[1] == "vody") {
        m_description += `- "${name}" containing time series of water meter values for water consumed by whole house.\n`
      }
      else if (fields[1] == "Wallbox") {
        m_description += `- "${name}" containing time series of energy meter values for energy consumed by electric car.\n`
      }
      else {
        m_description += `- "${name}" containing time series of energy meter values for appliance called "${fields[1]}".\n`
      }
    }
    if (fields[0] == "Teplota") {
      if (fields[1] == "venku") {
        m_description += `- "${name}" containing time series of outside temperature.\n`
      }
      else if (fields[1] == "bojler") {
        m_description += `- "${name}" containing time series of boiler temperature\n`
      }
      else {
        m_description += `- "${name}" containing time series of temperature in roomt called "${fields[1]}"\n`
      }
    }

  }
  return m_description;
}

async function query_influxdb(req, res) {
  var username = req.auth.payload.sub;
  const { homeId } = req.params;
  const db = req.app.get('db');
  var question = req.body.question;

  var home = db.get_home(homeId, username);
  if (!home) {
    res.status(404).send({msg: 'Dům neexistuje'});
    return;
  }

  var m_description = await get_measurements(home.name, []);

  var msg = `You are an InfluxDB database engineer. You have a InfluxDB Bucked with following measurements inside:

${m_description}

Take this user question in czech language "${question}" and write a simple python script returning Python list as JSON list with following items in this order:

- Python list with the names of buckets most likely used in the resulting query.
- The start of a time-range the query should use represented as unix timestamp.
- The end of a time-range the query should use represented as unix timestampl.

Use the datetime module to compute the time-range according to datetime.now().

Show ONLY the resulting Python script.
  `

  console.log("Querying OpenAI with ", msg);
  var completion = await openai.chat.completions.create({
    messages: [{ role: "assistant", content: msg }],
    model: "gpt-4o",
    temperature: 0,
  });

  python_code = completion.choices[0]["message"]["content"];
  if (python_code.indexOf("```python") != -1) {
    python_code = python_code.substring(python_code.indexOf("```python") + 9, python_code.lastIndexOf("```"));
  }
  if (python_code.indexOf("```") != -1) {
    python_code = python_code.substring(python_code.indexOf("```") + 3, python_code.lastIndexOf("```"));
  }
  fs.writeFileSync('/tmp/script.py', python_code);
  var data = run_cmd('python3 /tmp/script.py')
  console.log(data);

  m_description = await get_measurements(home.name, data[0]);

  if (m_description.includes("Měřič")) {
    m_description += `\nFor measurements with "Měřič" in name, use Flux "spread" function as fn argument in aggregateWindow to determine the value between time interval and set "createEmpty" to false in aggregateWindow for them.\n`
  }

  m_description += "Do not use \"experimental\" Flux module.\n"

  msg = `Imagine you are an InfluxDB database engineer. Your Bucket is called "${home.name}" and you have following measurements in this Bucket:

  ${m_description}
  
  With this knowledge, construct query in the Flux format for the following request in czech language: "${question}".
  
  Show only the resulting Flux query. Always keep the "_time" and "_measurement" columns in the result. If time substraction is needed, use "date.sub()" function to substract time values.
  
  As range(), always use "range(start: ${data[1]}, stop: ${data[2]})"
  
  You MUST only show the Flux query without any description.`

  console.log("Querying OpenAI with ", msg);
  completion = await openai.chat.completions.create({
    messages: [{ role: "assistant", content: msg }],
    model: "gpt-4o",
    temperature: 0,
  });
  query = completion.choices[0]["message"]["content"];
  if (query.indexOf("```flux") != -1) {
    query = query.substring(query.indexOf("```flux") + 7, query.lastIndexOf("```"));
  }
  if (query.indexOf("```") != -1) {
    query = query.substring(query.indexOf("```") + 3, query.lastIndexOf("```"));
  }

  query = query.replace('import "date"', "");
  query = `import "date"
import "timezone"
option location = timezone.location(name: "Europe/Prague")

  ${query}`
  //query = query.replace("date.truncate(t: now(), unit: 1w))", "date.add(d:4d, to:date.truncate(t: now(), unit: 1w)))")
  console.log(query)
  try {
    var result = await influx_query(query);
  } catch (error) {
    console.error(error);
    result = {};
  }
  

  var ret = {
    query: query,
    result: result
  };

  res.send(ret);
}


module.exports = {query_influxdb};
