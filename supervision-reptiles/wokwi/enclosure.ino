// ESP32-C3 : deux bus 1-Wire pour identifier sans ambiguite chaud et froid.
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <BH1750.h>
const int PIN_HOT=4, PIN_COLD=3, PIN_DOOR=5;
OneWire hotBus(PIN_HOT), coldBus(PIN_COLD);
DallasTemperature hot(&hotBus), cold(&coldBus);
BH1750 light(0x23);
volatile bool doorChanged=false;
volatile uint32_t changedAt=0;
bool converting=false;
uint32_t started=0, nextReading=0;
int reportedDoor=HIGH;
void IRAM_ATTR onDoor() { changedAt=millis();doorChanged=true; }
void setup() {
  Serial.begin(115200);
  pinMode(PIN_DOOR,INPUT_PULLUP);
  reportedDoor=digitalRead(PIN_DOOR);
  attachInterrupt(digitalPinToInterrupt(PIN_DOOR),onDoor,CHANGE);
  hot.begin();cold.begin();hot.setResolution(12);cold.setResolution(12);
  hot.setWaitForConversion(false);cold.setWaitForConversion(false);
  Wire.begin(6,7);
  bool ready=light.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  ready=light.setMTreg(31) && ready; // H-res : pleine echelle theorique > 100000 lx.
  Serial.printf("boot | BH1750 %s | door %s\n",ready?"OK":"ABSENT",reportedDoor==LOW?"closed":"open");
}
void loop() {
  uint32_t now=millis();
  // Anti-rebond 30 ms ; pas d'attente de 5 s, ni de conversion bloquante.
  if(doorChanged && uint32_t(now-changedAt)>=30) {
    noInterrupts();doorChanged=false;interrupts();
    int d=digitalRead(PIN_DOOR);
    if(d!=reportedDoor){reportedDoor=d;Serial.printf("door %s | ms=%lu\n",d==LOW?"closed":"open",(unsigned long)now);}
  }
  if(!converting && int32_t(now-nextReading)>=0) {
    hot.requestTemperatures();cold.requestTemperatures();started=now;converting=true;
  }
  if(converting && uint32_t(now-started)>=750) {
    Serial.printf("temp_hot %.2f C | temp_cold %.2f C | light %.0f lx\n",hot.getTempCByIndex(0),cold.getTempCByIndex(0),light.readLightLevel());
    converting=false;nextReading=now+4250;
  }
  yield();
}
