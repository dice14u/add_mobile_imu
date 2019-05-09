import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Image,
  Button
} from 'react-native';
import ReactNativeSensors from "react-native-sensors";

const Value = ({name, value}) => (
  <View style={styles.valueContainer}>
    <Text style={styles.valueName}>{name}:</Text>
    <Text style={styles.valueValue}>{new String(value).substr(0, 8)}</Text>
  </View>
)

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      accX : 0, accY : 0, accZ : 0,
      gyroX : 0, gyroY : 0, gyroZ : 0,
      pressure: 1013.25,
      magX: 0, magY: 0, magZ: 0,
      magInclination: 57.37, magDeclination: -6.42130,
      lat: 0, lon: 0
    };

    this.halting = false;
    this.heading = {
      bearing: 0,
      pitch: 0,
      roll: 0,
      x: 0,
      y: 0,
      z: 0,
      strength: 0
    }

    this.bindSensors();

    navigator.geolocation.setRNConfiguration({
      skipPermissionRequests: false
    });
  }

  getVectorMagnitude(x, y = 0, z = 0) {
    return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2)); 
  }

  createRotationMatrix() {
    const {magX, magY, magZ, magInclination, magDeclination} = this.state;

    const frd = [ magX, magY, magZ ];
    const xy = this.getVectorMagnitude(frd[0], frd[1]);

    const decl = magDeclination * Math.PI / 180.0;
    const incl = magInclination * Math.PI / 180.0;

    const cy = Math.cos(decl);
    const sy = Math.sin(decl);
    const cp = Math.cos(incl);
    const sp = Math.sin(incl);

    const rot3 = [
      [cy * cp, -sy * cp, sp],
      [sy, cy, 0],
      [-sp*cy, sy * sp, cp]
    ];

    const rotDo = (posish) => {
      return (rot3[posish][0]*frd[0])
        +(rot3[posish][1]*frd[1])
        +(rot3[posish][2]*frd[2]);
    }
    const output = {
      x: rotDo(0),
      y: rotDo(1),
      z: rotDo(2)
    }

    const {accX, accY, accZ} = this.state;
    const bearing = Math.atan2(output.y, output.x);
    const pitch = Math.asin(output.x);
    const roll = Math.asin(output.y);
  
    this.heading.bearing = bearing * 180 / Math.PI;
    this.heading.pitch= pitch * 180 / Math.PI;
    this.heading.roll = roll * 180 / Math.PI;
    this.heading.x = output.x;
    this.heading.y = output.y;
    this.heading.z = output.z;


    
    //this.heading.pitch = Math.asin(accY/gravity) * 180 / Math.PI;
    //this.heading.roll = Math.asin(accX/gravity) * 180 / Math.PI;
  
    return [
      { rotateZ: `${bearing}rad`},
      { rotateX: `${pitch}rad`},
      { rotateY: `${roll}rad`}
    ]
  }

  bindSensors() {
    let stats = {
      accX : 0, accY : 0, accZ : 9.8,
      gyroX : 0, gyroY : 0, gyroZ : 0,
      pressure: 1013.25,
      magX: 0, magY: 0, magZ: 0,
      lat: 0, lon: 0
    };
    let dirty = false;
    setInterval(() => {
      if (dirty && !this.halting) {
        this.setState(stats);
        dirty = false;
      }
    }, 30);
    const onError = () => {};
    ReactNativeSensors.accelerometer.subscribe(
      ({x,y,z}) => {
        const gravity = this.getVectorMagnitude(x, y, z);
        stats.accX = x/gravity;
        stats.accY = y/gravity;
        stats.accZ = z/gravity;
        dirty = true;
      },
      onError
    );
    ReactNativeSensors.barometer.subscribe(
      ({pressure}) => {
        stats.pressure = pressure;
        dirty = true;
      },
      onError
    );
    ReactNativeSensors.magnetometer.subscribe(
      ({x, y, z}) => {
        const strength = this.getVectorMagnitude(x, y, z);
        // turn to forward right down vector
        stats.magX =  y / strength;
        stats.magY = x / strength;
        stats.magZ = -z / strength;
        this.heading.strength = strength;
        dirty = true;
      },
      onError
    );
    ReactNativeSensors.gyroscope.subscribe(({x, y, z}) => {
      stats.gyroX = x;
      stats.gyroY = y;
      stats.gyroZ = z;
      dirty = true;
    }, onError);

    navigator.geolocation.watchPosition((position) => {
      stats.lat = position.coords.latitude;
      stats.lon = position.coords.longitude;
    }, onError, { enableHighAccuracy: true});
  }
  setInclination(text) {
    let out = parseFloat(text);
    if (out === null || out === NaN) {
      return;
    }
    this.setState({magInclination: out});
    this.halting = false;
  }

  setDeclination(text) {
    let out = parseFloat(text);
    if (out === null || out === NaN) {
      return;
    }
    this.setState({magDeclination: out});
    this.halting = false;
  }
  
  render() {
    return (
      <ScrollView>
        <Image source={require('./images/compassNeedle.png')} 
          style={{
            transform: this.createRotationMatrix()
          }}
        />
        <Value name="bearing" value={this.heading.bearing}></Value>
        <Value name="pitch" value={this.heading.pitch}></Value>
        <Value name="roll" value={this.heading.roll}></Value>
        <Value name="x" value={this.heading.x}></Value>
        <Value name="y" value={this.heading.y}></Value>
        <Value name="z" value={this.heading.z}></Value>
        <Value name="strength" value={this.heading.strength}></Value>
        <View style={styles.container}>
        <Text style={styles.headline}>
          Magneto values
        </Text>
        <Value name="x" value={this.state.magX} />
        <Value name="y" value={this.state.magY} />
        <Value name="z" value={this.state.magZ} />
        <Text style={styles.headline}>
          Accelerometers values
        </Text>
        <Value name="x" value={this.state.accX} />
        <Value name="y" value={this.state.accY} />
        <Value name="z" value={this.state.accZ} />
        <Text style={styles.headline}>
          Barometer values
        </Text>
        <Value name="pressure" value={this.state.pressure} />

        <Text style={styles.headline}>
          Gyro values
        </Text>
        <Value name="x" value={this.state.gyroX} />
        <Value name="y" value={this.state.gyroY} />
        <Value name="z" value={this.state.gyroZ} />
        <Text style={styles.headline}>
          GPS values
        </Text>
        <Value name="lat" value={this.state.lat} />
        <Value name="lon" value={this.state.lon} />
        <Text style={styles.headline}>
          Magnetic Corrections
        </Text>
        <View>
          <TextInput 
            style={styles.textInput}
            keyboardType='numeric'
            placeholder="Set inclination"
            onFocus={() => { this.halting = true; }}
            onChangeText={this.setInclination.bind(this)}
            maxLength={10}
          />
          <Value name="incl" value={this.state.magInclination}></Value>
        </View>
        <View>
          <TextInput 
            style={styles.textInput}
            keyboardType='numeric'
            placeholder="Set declination"
            onFocus={() => { this.halting = true; }}
            onChangeText={this.setDeclination.bind(this)}
            maxLength={10}
          />
          <Value name="declination" value={this.state.magDeclination}></Value>
        </View>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  headline: {
    fontSize: 30,
    textAlign: 'center',
    margin: 10,
  },
  valueContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  valueValue: {
    fontSize: 20
  },
  valueName: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
